// src/utils/BinaryUtils.ts

export class BinaryUtils {
  // ממיר מחרוזת טקסט לרצף של '0' ו-'1'
  static stringToBinary(input: string): string {
    return input
      .split('')
      .map((char) => {
        // ממיר כל תו לקוד ASCII בינארי באורך 8 ביטים
        return char.charCodeAt(0).toString(2).padStart(8, '0');
      })
      .join('');
  }

  // ממיר רצף בינארי חזרה לטקסט
  static binaryToString(binary: string): string {
    // מחלקים לקבוצות של 8 ביטים
    const bytes = binary.match(/.{1,8}/g) || [];
    return bytes
      .map((byte) => String.fromCharCode(parseInt(byte, 2)))
      .join('');
  }
}