/**
 * Parse string page range menjadi array nomor halaman.
 *
 * Format yang didukung:
 *   "3"        → [3]
 *   "2-5"      → [2, 3, 4, 5]
 *   "1,3,5"    → [1, 3, 5]
 *   "1-3,7,9-11" → [1, 2, 3, 7, 9, 10, 11]
 *   "2-10"     → [2, 3, 4, 5, 6, 7, 8, 9, 10]
 *
 * Spasi diabaikan. Input tidak valid atau di luar range akan di-skip.
 *
 * @param {string} rangeStr - string page range dari user
 * @param {number} maxPages - jumlah halaman total
 * @returns {number[]} array nomor halaman terurut, tanpa duplikat
 */
export function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) return [];

  const pages = new Set();

  // Pisah per koma
  const segments = rangeStr.split(",").map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    // Cek apakah ini range (e.g. "3-7") atau single page (e.g. "5")
    const rangeMatch = seg.match(/^(\d+)\s*-\s*(\d+)$/);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        if (i >= 1 && i <= maxPages) pages.add(i);
      }
    } else {
      const num = parseInt(seg, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Kebalikan dari parsePageRange: mengubah array nomor halaman
 * menjadi string range yang ringkas.
 *
 * [1,2,3,5,7,8,9] → "1-3,5,7-9"
 *
 * @param {number[]} pages - array nomor halaman terurut
 * @returns {string}
 */
export function compressToRange(pages) {
  if (!pages || pages.length === 0) return "";

  const sorted = [...pages].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);

  return parts.join(",");
}
