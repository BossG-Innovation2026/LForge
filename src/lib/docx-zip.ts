export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function u16At(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8);
}

function u32At(b: Uint8Array, i: number): number {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | b[i + 3] * 0x1000000) >>> 0;
}

function pushU16(arr: number[], v: number): void {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}

function pushU32(arr: number[], v: number): void {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(bytes: Uint8Array): Promise<ZipEntry[]> {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  const minStart = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minStart; i--) {
    if (u32At(bytes, i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-central-directory).");

  const entryCount = u16At(bytes, eocd + 10);
  const cdOffset = u32At(bytes, eocd + 16);

  const entries: ZipEntry[] = [];
  let pos = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (u32At(bytes, pos) !== 0x02014b50) throw new Error("Corrupt ZIP central directory.");
    const method = u16At(bytes, pos + 10);
    const compSize = u32At(bytes, pos + 20);
    const nameLen = u16At(bytes, pos + 28);
    const extraLen = u16At(bytes, pos + 30);
    const commentLen = u16At(bytes, pos + 32);
    const localOffset = u32At(bytes, pos + 42);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

    if (u32At(bytes, localOffset) !== 0x04034b50) throw new Error(`Corrupt ZIP local header for ${name}.`);
    const lNameLen = u16At(bytes, localOffset + 26);
    const lExtraLen = u16At(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const compData = bytes.subarray(dataStart, dataStart + compSize);

    let data: Uint8Array;
    if (method === 0) {
      data = compData;
    } else if (method === 8) {
      data = await inflateRaw(compData);
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`);
    }

    entries.push({ name, data });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function buildZip(entries: ZipEntry[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const deflated = await deflateRaw(entry.data);
    const useDeflate = deflated.length < entry.data.length;
    const stored = useDeflate ? deflated : entry.data;
    const method = useDeflate ? 8 : 0;

    const local: number[] = [];
    pushU32(local, 0x04034b50);
    pushU16(local, 20);
    pushU16(local, 0x0800);
    pushU16(local, method);
    pushU16(local, 0);
    pushU16(local, 0);
    pushU32(local, crc);
    pushU32(local, stored.length);
    pushU32(local, entry.data.length);
    pushU16(local, nameBytes.length);
    pushU16(local, 0);
    const localHead = new Uint8Array(local);
    locals.push(localHead, nameBytes, stored);

    const central: number[] = [];
    pushU32(central, 0x02014b50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0x0800);
    pushU16(central, method);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, crc);
    pushU32(central, stored.length);
    pushU32(central, entry.data.length);
    pushU16(central, nameBytes.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, offset);
    const centralHead = new Uint8Array(central);
    centrals.push(centralHead, nameBytes);

    offset += localHead.length + nameBytes.length + stored.length;
  }

  const cdSize = centrals.reduce((n, p) => n + p.length, 0);
  const eocd: number[] = [];
  pushU32(eocd, 0x06054b50);
  pushU16(eocd, 0);
  pushU16(eocd, 0);
  pushU16(eocd, entries.length);
  pushU16(eocd, entries.length);
  pushU32(eocd, cdSize);
  pushU32(eocd, offset);
  pushU16(eocd, 0);

  return concat([...locals, ...centrals, new Uint8Array(eocd)]);
}
