import Link from "next/link";
import { Copyright } from "@/components/ui";
import { APP_NAME, TERMS_VERSION } from "@/lib/constants";

export const metadata = { title: `תנאי שימוש | ${APP_NAME}` };

/** Draft wording. A lawyer licensed in Israel reviews it before launch. */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 leading-relaxed">
      <h1 className="font-display text-2xl font-semibold">תנאי שימוש והבהרה</h1>
      <p className="mt-1 text-sm text-ink-soft">גרסה {TERMS_VERSION}</p>
      <ul className="mt-6 list-disc space-y-3 ps-5">
        <li>השמות, המשמעויות, המקורות, המקורות המקראיים וההסברים נוצרים בבינה מלאכותית ומנתונים סטטיסטיים פומביים. הם עלולים להיות שגויים, חלקיים או פוגעניים בקהילות או בשפות מסוימות.</li>
        <li>שום דבר באפליקציה אינו ייעוץ משפטי, דתי, רפואי או מקצועי.</li>
        <li>אין התחייבות ששם יתקבל במרשם האוכלוסין או שיתאים לילד או לילדה ולמשפחה. כדאי לבדוק זאת לפני רישום השם.</li>
        <li>השירות ניתן כפי שהוא, ללא התחייבות לדיוק או לזמינות.</li>
        <li>השימוש באפליקציה הוא באחריות אישית בלבד. במידה שהחוק מתיר, המפעיל אינו אחראי לכל נזק או אובדן הנובעים מהשימוש בתוצרים.</li>
        <li>הנתונים הסטטיסטיים מגיעים מהלשכה המרכזית לסטטיסטיקה, והמפעיל אינו אחראי להם.</li>
        <li>טקסט חופשי שנכתב באפליקציה נשלח לספק הבינה המלאכותית. אין לכתוב בו פרטים אישיים רגישים.</li>
        <li>אין להשתמש באפליקציה כדי לפגוע או ללעוג לאדם או לקהילה כלשהם.</li>
      </ul>
      <h2 className="mt-8 font-display text-xl font-semibold">פרטיות</h2>
      <ul className="mt-3 list-disc space-y-3 ps-5">
        <li>כל מה שמוזן באפליקציה נשמר רק בדפדפן במכשיר הזה. השרת לא שומר את ההעדפות, את שמות המשפחה או את תאריך הלידה, מלבד בדיווח תקלה כמתואר כאן.</li>
        <li>כשמתרחשת תקלה, נשלחים לצוות הפיתוח הצעדים האחרונים באפליקציה, כולל מה שהוקלד ונבחר (אבל לא תאריך הלידה, שם המשפחה ושמות בני המשפחה), כדי לאתר את התקלה ולתקן אותה. הדיווח נשמר במקום פרטי שרק הצוות רואה.</li>
        <li>האפליקציה לא שומרת מידע מזהה, לא מאפשרת מעקב ולא משתמשת בעוגיות מעקב או בכלי מעקב.</li>
        <li>תאריך הלידה לא נשלח לשרת: רק החודש העברי, חג קרוב, המזל והעונה.</li>
        <li>משוב שנשלח נשמר עד שהוא נשלח לצוות במייל היומי, ואז נמחק.</li>
        <li>ניקוי נתוני הדפדפן או מעבר למכשיר אחר מתחילים מחדש. כדי לשמור תוצאה, אפשר לייצא את הרשימה.</li>
      </ul>
      <Link href="/" className="mt-8 inline-block font-medium text-rose-dark underline">
        חזרה לאפליקציה
      </Link>
      <footer className="mt-8 border-t border-line pt-4 text-ink-soft">
        <Copyright />
      </footer>
    </main>
  );
}
