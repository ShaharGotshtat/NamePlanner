# Name data rules

The content of every name lives in `data/name-content.tsv`. `npm run data:build` turns it and the CBS counts into `data/names.json`, and `tests/name-data.test.ts` checks the rules below.

## Latin spellings (`translit`)

- List every spelling Israelis commonly use, most common first: Eyal, Ayal; Nofar, Nufar.
- No weak or invented spellings that almost nobody uses.
- A name with ח has a spelling with Ch and a spelling with H: Chen, Hen; Nachshon, Nahshon.
- The Latin matches the niqqud (תַּהֵל is Tahel, not Tehel).

## Other spellings of the same name (`reading_of`, `variants`)

- When a spelling is pronounced the same as a more common spelling of the same name, `reading_of` names that spelling: תם → תום, לטם → לוטם, שליו → שלו. The build adds its CBS counts to that name, lists it as a variant, and gives it no card of its own. The card shows "נכתב גם: תם".
- Do not merge different names that look alike: אשר and אושר, ליאם and ליעם, אלמה and עלמה.
- A spelling that has a common reading of its own stays a separate name and says both in its meaning (אילת: the city, and כתיב חסר of איילת).
- `variants` needs only one side; the build makes every link two-way.

## Tags

- תנ״כי only for a person or place in the Bible, and always with `biblical_ref`. A Hebrew word that appears in a verse (שירה, עמית) keeps the verse but not the tag.
- אמונה only for a name with אל or יה, or a clearly religious meaning.

## Names that are not names

- A single word CBS lists that is really half of a double name (בת, שבע, היא, שר) is left out, in `FRAGMENTS` in `scripts/build-names.ts`.

## Meanings

- Short, and never only the name itself.
- No guessed etymology: say "שם מהתלמוד" or "פירוש השם לא ודאי" instead.
