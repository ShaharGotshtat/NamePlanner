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

## Forms of another name (`form_of`)

- A nickname, or a Yiddish or foreign form, names its original in `form_of`: דני → דניאל, מריה → מרים, אליזבט → אלישבע, סמואל → שמואל. Two originals are separated by a comma (מיקה → מיכאל, מיכל).
- `form_of` names the original itself, never another form: מייקי → מיכאל, not מייקל.
- The build gives the form the original's tags, verse and holiday links, on top of its own, so סמואל is תנ״כי like שמואל. The card says "השם שמואל מופיע בתנ״ך", because the verse has the original, not the form.
- The original does not have to be in the list (ליזה → אלישבע is, קרולינה → קרל is not). Only an original in the list passes on its tags.
- Leave it empty when the name's own meaning comes first and it is only also short for another name (נרי, אילי).
- Leave it empty for a feminine name made from a man's name (דניאלה, מיכאלה, גבריאלה). It is a name of its own, so it does not get the man's verse; tag it from its own meaning.

## Tags

- תנ״כי only for a person or place in the Bible, and always with `biblical_ref`. A Hebrew word that appears in a verse (שירה, עמית) keeps the verse but not the tag.
- אמונה only for a name with אל or יה, or a clearly religious meaning.

## Names that are not names

- A single word CBS lists that is really half of a double name (בת, שבע, היא, שר) is left out, in `FRAGMENTS` in `scripts/build-names.ts`.

## Meanings

- Short, and never only the name itself.
- The meaning comes first. A form of another name ends with what it is a form of: "שאלתיו מאל. הצורה הבינלאומית של שמואל", "האל הוא שופטי. הצורה הנקבית של דניאל". When the original's meaning is a person, say whose name it is: "על שם מרים הנביאה. צורת חיבה של מרים".
- Look the meaning up. Behind the Name is the most reliable source for international and Yiddish names. Israeli name sites often contradict themselves, so do not copy them without checking.
- When sources give several readings, write the most common one, or two at most (מירה: שלום, עולם; ים).
- A new Hebrew name may be read from the Hebrew words it is made of (לינס: לי נס, הנס שלי), with confidence L.
- Write "פירוש השם לא ודאי" only when no source explains the name. Never invent an etymology.
