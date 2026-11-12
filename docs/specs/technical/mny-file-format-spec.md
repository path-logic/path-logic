# Microsoft Money (`.mny`) File Format & Deserialization Specification

## 1. Overview & Reverse Engineering Provenance

This specification documents the binary layout, multi-layer cryptographic architecture, Jet 4.0 / MSISAM page & record structures, and MSOFD field-level column encryption of Microsoft Money Plus (`17.0.0.3817`) `.mny` database files.

All findings were obtained via static binary reverse engineering using **Reverse Engineer Anything (`morluto/rea` v6.7.0)** backed by **Ghidra 12.1.4** and **Rizin v0.9.1**, and empirically verified against `/mnt/c/Program Files (x86)/Microsoft Money Plus/sample.mny`.

### Binary Targets & REA Evidence IDs

| Binary         | Role                                                                        | Base Address | REA Evidence IDs                                                                                                                                                                                                                                                                           |
| :------------- | :-------------------------------------------------------------------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `msmoney.exe`  | UI Shell & Startup Dispatcher                                               | `0x1bf00000` | `ev_981e8a7fc07c04810caacc3d694cefbe00c21862bd476792d281849095e5ae42`                                                                                                                                                                                                                      |
| `myisam08.dll` | Microsoft Money ISAM / Jet 4.0 Storage & Page Crypto Engine                 | `0x00400000` | `ev_676458fa4905f8925420392e4edec24387a178a8cb5619460b43911c10b746d0`, `ev_19d890492accdf8b40dec9e711e0e4efe4ab85eedb0fc26eb607e022150996e5`, `ev_8ada89fc14b0058b032a5e2d9027c6c988546ddd0c48a04f374491b819634a5c`, `ev_6206952491bee90ec1b78f37bdda7c290fbc39e903aced281ab23da4b2200cb1` |
| `msofd.dll`    | Microsoft Open Financial Database (Schema, Table Definitions, Field Crypto) | `0x2ebc0000` | `ev_caf9047b97988eb77d8ad22897a140c2bd1f90ff5afb40a1035dd712e4121ceb`                                                                                                                                                                                                                      |

---

## 2. Layer 1: MSISAM Page & Header Cryptography (`myisam08.dll`)

A `.mny` file is divided into fixed-size pages of **`0x1000` (4,096) bytes**.

### 2.1 Page 0 Database Header & RC4 Header Obfuscation

- **Magic Signature (`0x00..0x17`)**:
    - `0x00..0x03`: `00 01 00 00` (Header page tag)
    - `0x04..0x13`: `"MSISAM Database\0"` (16-byte ASCII signature)
    - `0x14..0x17`: `uint32LE` file format version (`1`)
- **RC4-Encrypted Header Region (`0x18..0x97`, 128 bytes)**:
    - Decompiled at `FUN_0040ce80` (`0x0040ce80` in `myisam08.dll`).
    - Encrypted with standard **RC4** (`FUN_0040cdfc` KSA / `FUN_0040cda6` PRGA) using the 4-byte little-endian constant `0x6b39dac7` (`[0xc7, 0xda, 0x39, 0x6b]`).
    - Decrypted field layout within Page 0:
        - `0x3c..0x3d` (`uint16LE`): Windows CodePage (`0x04e4` = 1252).
        - `0x3e..0x41` (`uint32LE`): Legacy Jet encoding key (`0` when CryptoAPI mode is used).
        - `0x6a..0x6d` (`uint32LE`): Engine build version (`0x0c23` = 3107).
        - `0x6e..0x71` (`uint32LE`): Locale ID / LCID (`0x0409` = 1033).
        - `0x72..0x79` (`8 bytes`): **Database Salt (`salt8`)**. Let `salt0 = salt8.readUInt32LE(0)` and `saltByte0 = salt8[0]`.

### 2.2 Crypto Flags & Key Verification Block (`0x298`)

Decompiled at `FUN_004305e7` (`0x004305e7`), `FUN_0041bd6a` (`0x0041bd6a`), and `FUN_0041be67` (`0x0041be67`) in `myisam08.dll`:

- **Crypto Flags Byte (`Page0[0x298]`)**:
    - `0x02 | 0x04` (`0x06`): Enables CryptoAPI hash-based RC4 key derivation (`FUN_0041bd6a`).
    - `0x04`: Uses **128-bit RC4 key** (16 bytes of hash digest); if clear, uses **40-bit RC4 key** (5 bytes of hash digest).
    - `0x08`: Key verification block is shifted by `varOffset = saltByte0` (`Page0[0x72]`); if clear, `varOffset = 0`.
    - `0x10`: Includes the 40-byte password buffer in MSOFD field-level column key derivation.
    - `0x20`: Hash algorithm is **SHA-1** (`CALG_SHA1 = 0x8004`); if clear, **MD5** (`CALG_MD5 = 0x8003`).
- **Key Block (`0x299 + varOffset`, 85 bytes)**:
    - `+0x00..+0x27` (40 bytes): `ONL\` (Passport/Live ID) encrypted key slot.
    - `+0x28..+0x4f` (40 bytes): `OFL\` (Offline password) encrypted key slot.
    - `+0x50..+0x53` (4 bytes, at `0x2e9 + varOffset`): Encrypted 4-byte check value.
    - `+0x54` (1 byte, at `0x2ed + varOffset`): Password mode (`0` = no user password; `3` or `4` = password-protected).
- **Key Prefix & Check Verification (`FUN_0041be67`)**:
    1. Construct a 40-byte (`0x28`) buffer `pwdBuf40`: uppercase UTF-16LE password padded with zeros (all `0x00` bytes when no password is set).
    2. Compute `digest = (flags & 0x20) ? SHA1(pwdBuf40) : MD5(pwdBuf40)`.
    3. Extract `keyPrefix = digest.subarray(0, (flags & 0x04) ? 16 : 5)`.
    4. Decrypt the 4-byte check value at `Page0[0x2e9 + varOffset .. 0x2ec + varOffset]` using `RC4(concat(keyPrefix, salt8))`.
    5. The resulting `uint32LE` **must equal `salt0`**.

### 2.3 Per-Page RC4 Decryption (`FUN_00414ec0` at `0x00414ec0`)

- Pages `1 <= p <= 14` (`p < 0x0f`) are **always** RC4-encrypted, even when the `.mny` file has no user password.
- Pages `p >= 15` (`p >= 0x0f`) are RC4-encrypted if and only if full-database password encryption is active (`!(rawPage15[0] === 0x02 && rawPage15[1] === 0x01)`).
- For any encrypted page `p >= 1`, the per-page RC4 key is:
  $$\text{PageKey}(p) = \text{keyPrefix} \;\|\; \text{uint32LE}(\text{salt0} \oplus p)$$

---

## 3. Layer 2: Jet 4.0 / MSISAM Page & Record Layout

### 3.1 Table Definition (`TDEF`) Pages (`02 01`)

- `0x00..0x01`: `02 01` (`TDEF` page signature).
- `0x04..0x07` (`uint32LE`): Next `TDEF` continuation page number (`0` if none; when non-zero, append `nextPage.subarray(0x08)`).
- `0x10..0x13` (`int32LE`): `rowCount`.
- `0x28` (`uint8`): Table type (`0x53` = `'S'` system table, `0x55` = `'U'` user table).
- `0x29..0x2a` (`uint16LE`): `maxCols` (total columns ever allocated).
- `0x2b..0x2c` (`uint16LE`): `numVarCols` (variable-length columns count).
- `0x2d..0x2e` (`uint16LE`): `numCols` (active columns count).
- `0x2f..0x32` (`int32LE`): `numIndexes`.
- `0x33..0x36` (`int32LE`): `numRealIndexes`.
- **Column Descriptors (`0x3f + numRealIndexes * 12`)**:
    - `numCols` entries of **25 bytes** each:
        - `+0` (`uint8`): `colType` (`1`=Boolean, `2`=Byte, `3`=Int16, `4`=Int32, `5`=Currency `int64`, `6`=Single, `7`=Double, `8`=DateTime `float64`, `9`=Binary, `10`=Text, `11`=LongBinary, `12`=Memo, `15`=GUID).
        - `+5..+6` (`uint16LE`): `colId` (null-bitmap index).
        - `+7..+8` (`uint16LE`): `varColNum` (variable offset table index).
        - `+15` (`uint8`): `colFlags` (`0x01` = fixed-length column).
        - `+21..+22` (`uint16LE`): `fixedOffset` (byte offset relative to `rowStart + 2`).
        - `+23..+24` (`uint16LE`): `maxLength`.
- **Column Names**: Immediately following the `numCols * 25` descriptors are `numCols` UTF-16LE strings, each prefixed by a `uint16LE` byte length.

### 3.2 Data (`DATA`) Pages (`01 01`) & Long-Value (`LVAL`) Pages

- `0x00..0x01`: `01 01`.
- `0x04..0x07` (`uint32LE`): Owning `TDEF` page number (or `0x76616c4c` `"Lval"` for long-value pages).
- `0x0c..0x0d` (`uint16LE`): `numRows`.
- `0x0e + r * 2` (`uint16LE`): Row pointer `desc` for row `r`:
    - `rowStart = desc & 0x1fff`, `rowEnd = (r === 0) ? 0x1000 : (prevDesc & 0x1fff)`.
    - `desc & 0x4000`: Deleted row (ignored).
    - `desc & 0x8000`: Overflow row pointer; the 4-byte `uint32LE` at `rowStart` encodes `targetPage = ptr >>> 8` and `targetRow = ptr & 0xff`.
- **Row Record Format**:
    - `0x00..0x01` (`uint16LE`): `numColsInRow = val & 0x7fff`.
    - `nullBitmapLen = ceil(numColsInRow / 8)` at the very end of the row: bit `(colId & 7)` of `nullBitmap[colId >> 3]` is `1` when non-null (or `true` for Boolean columns).
    - Fixed-length columns reside at `2 + fixedOffset`.
    - Variable-length columns are indexed from the tail prior to `nullBitmap`: `varCountOffset = rowLen - nullBitmapLen - 2`, with `uint16LE` offsets growing backward (`varCountOffset - (varColNum + 1) * 2`).

### 3.3 Column Value Encodings

- **Currency (`colType = 5`)**: 8-byte signed `int64LE` scaled by `10,000` (`$1.00 = 10000`). Converted to Path Logic integer `Cents` via `Number(rawInt64 / 100n)`.
- **DateTime (`colType = 8`)**: 8-byte IEEE-754 `float64LE` OLE Automation `DATE` (days since `1899-12-30`).
    - **Unset Date Sentinel**: `msofd.dll` (`0x2ebc1c45` / `0x2ebc1c68`) uses `2958460.0` (`00 00 00 00 5e 92 46 41`, year 9999) for unset dates. Any value `<= 0` or `>= 2958460.0` decodes to `null`.
- **Text (`colType = 10`)**: Starts with `ff fe` for Jet 4.0 Compressed Unicode (`0x00` toggles between 1-byte Latin-1 and 2-byte UTF-16LE), or raw UTF-16LE.

---

## 4. Layer 3: MSOFD Field-Level Column Encryption (`msofd.dll`)

Decompiled at `0x2ec021e0`, `0x2ebe2e2c`, `0x2ebfcd98`, and `0x2ec02698` in `msofd.dll`:

Certain sensitive Memo (`colType = 12`) columns are RC4-encrypted at the application layer before being stored in Jet `DATA`/`LVAL` pages:

| Table   | Column                      | `colId` | Column Salt (`0x2ebfcd98`) |
| :------ | :-------------------------- | :------ | :------------------------- |
| `ACCT`  | `mNum` (Account Number)     | `28`    | `0x0a` (10)                |
| `ADDR`  | Encrypted Address Blob      | `5`     | `0x14` (20)                |
| `XACCT` | External Account Number     | `3`     | `0x1e` (30)                |
| `PAY`   | Encrypted Payee Identifiers | `7..10` | `0x28..0x2b` (40..43)      |

### Field Key Derivation Algorithm (`0x2ec021e0`)

1. Read table `CLI_DAT` (TDEF Page 119) and locate the row with `idData === 0x03f2` (`1010`).
2. Read its Memo LVAL payload `cli3f2`:
    - `idx16 = cli3f2.readUInt32LE(0) & 0x0f` selects a 16-byte constant from `msofd.dll` at `0x2ec02698 + idx16 * 32`.
    - Count non-zero `uint16LE` code units starting at `cli3f2 + 8` to obtain `wlen`.
3. Construct `hashInput` of length `wlen + 16 + ((flags & 0x10) ? 40 : 0)`:
    - `hashInput[0..15]`: 16-byte constant from `0x2ec02698 + idx16 * 32`.
    - `hashInput[15 .. 15 + wlen - 1]`: `wlen` bytes copied from `cli3f2[8 .. 8 + wlen - 1]` (intentionally overlapping index `15`, matching `msofd.dll` at `0x2ec022ac`).
    - `hashInput[15 + wlen .. 15 + wlen + 39]`: 40-byte uppercase UTF-16LE password buffer (when `flags & 0x10`).
4. Compute `fieldKey16 = ((flags & 0x20) ? SHA1(hashInput) : MD5(hashInput)).subarray(0, 16)`.
5. Decrypt each encrypted Memo payload with `RC4(concat(fieldKey16, uint32LE(colSalt)), memoBytes)` and decode as UTF-16LE.

---

## 5. Layer 4: Core MSOFD Financial Tables

- **`MSysObjects` (Page 2)**: System catalog mapping `Name` (`Type = 1`) to `Id` (`TDEF` page number).
- **`ACCT` (Page 15)**: Accounts (`hacct`, `szFull`, `at`, `amtOpen`, `mNum`, `fClosed`, `fFavorite`).
- **`CAT` (Page 88)**: Categories & Subcategories (`hcat`, `hcatParent`, `nLevel`, `szFull`, `ct`).
- **`PAY` (Page 300)**: Payees (`hpay`, `szFull`, `haddr`).
- **`TRN` (Page 502)**: Transactions (`htrn`, `hacct`, `dt`, `amt`, `hcat`, `lHpay`, `mMemo`, `szNum`, `cs`, `ps`, `instt`).
- **`TRN_SPLIT` (Page 1069)**: Split links (`htrnParent`, `htrn`, `iSplit`).
- **`TRN_XFER` (Page 1087)**: Cross-account transfer links (`htrnSrc`, `htrnDst`, `amtDst`).
