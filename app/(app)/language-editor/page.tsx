import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { getServerLocale } from "@/lib/i18n/server";

const DISCORD_URL = "https://discord.gg/VzBYYUsNJ6";

export const metadata = {
 title: "Become a language editor",
 description:
 "Purify speaks English and German today. Help us bring it to your language: we build the translation patch, you review it for accuracy and the right liturgical register. It starts on our Discord.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type Copy = {
 eyebrow: string;
 h1: string;
 lead: string;
 reason: string;
 workTitle: string;
 workBody: string;
 howTitle: string;
 steps: [string, string, string, string, string];
 ctaTitle: string;
 ctaBody: string;
 cta: string;
 closing: string;
};

// The page renders in the language the reader picked (the "coming soon"
// locale they clicked), so the recruitment copy lives in every locale.
// Partial: locales added in Beta 2.3 fall back to the English pitch below
// until their recruitment copy clears the editorial queue.
const COPY: Partial<Record<LocaleCode, Copy>> & { en: Copy } = {
 en: {
  eyebrow: "Become a language editor",
  h1: "We need you.",
  lead: "Purify doesn’t speak your language yet. That’s where you come in.",
  reason:
   "The saints, the Scriptures, the prayers, and the calendar are in English and German today. We would rather ship nothing than a machine translation of theology no one has read.",
  workTitle: "What the work is",
  workBody:
   "You don’t translate the whole app. We build the translation for your language; you review it. You read your own tongue with a careful eye, catch what sounds wrong in the prayers, and tell us. We fix it, and it goes live.",
  howTitle: "How it works",
  steps: [
   "Join our Discord.",
   "Tell us which language you would carry.",
   "We send you a draft of the app in that language.",
   "You review it; we correct what you flag.",
   "When it reads right, we turn it on for everyone.",
  ],
  ctaTitle: "It starts on the Discord.",
  ctaBody:
   "No theology degree required. We need a careful native reader who knows how the Church speaks in your language. Come say hello and name your language.",
  cta: "Join the Discord →",
  closing: "One language at a time. Maybe yours next.",
 },
 de: {
  eyebrow: "Sprachredakteur werden",
  h1: "Wir brauchen dich.",
  lead: "Purify spricht deine Sprache noch nicht. Genau da kommst du ins Spiel.",
  reason:
   "Die Heiligen, die Schriften, die Gebete und der Kalender sind heute auf Englisch und Deutsch. Lieber liefern wir nichts als eine maschinelle Übersetzung von Theologie, die niemand gelesen hat.",
  workTitle: "Was die Aufgabe ist",
  workBody:
   "Du übersetzt nicht die ganze App. Wir erstellen die Übersetzung für deine Sprache; du prüfst sie. Du liest deine eigene Sprache mit wachem Blick, findest, was in den Gebeten falsch klingt, und sagst es uns. Wir bessern aus, und es geht live.",
  howTitle: "So läuft es",
  steps: [
   "Tritt unserem Discord bei.",
   "Sag uns, welche Sprache du tragen möchtest.",
   "Wir schicken dir einen Entwurf der App in dieser Sprache.",
   "Du prüfst ihn; wir korrigieren, was du anmerkst.",
   "Wenn er stimmt, schalten wir ihn für alle frei.",
  ],
  ctaTitle: "Es beginnt auf Discord.",
  ctaBody:
   "Kein Theologiestudium nötig. Wir brauchen einen aufmerksamen Muttersprachler, der weiß, wie die Kirche in deiner Sprache spricht. Komm vorbei, sag Hallo und nenne deine Sprache.",
  cta: "Discord beitreten →",
  closing: "Eine Sprache nach der anderen. Vielleicht deine als nächste.",
 },
 fr: {
  eyebrow: "Devenez éditeur de langue",
  h1: "Nous avons besoin de vous.",
  lead: "Purify ne parle pas encore votre langue. C’est là que vous intervenez.",
  reason:
   "Les saints, les Écritures, les prières et le calendrier sont aujourd’hui en anglais et en allemand. Nous préférons ne rien publier plutôt qu’une traduction automatique d’une théologie que personne n’a lue.",
  workTitle: "En quoi consiste la tâche",
  workBody:
   "Vous ne traduisez pas toute l’application. Nous réalisons la traduction de votre langue ; vous la relisez. Vous lisez votre propre langue d’un œil attentif, repérez ce qui sonne faux dans les prières et nous le signalez. Nous corrigeons, et c’est mis en ligne.",
  howTitle: "Comment ça marche",
  steps: [
   "Rejoignez notre Discord.",
   "Dites-nous quelle langue vous porteriez.",
   "Nous vous envoyons un brouillon de l’application dans cette langue.",
   "Vous le relisez ; nous corrigeons ce que vous signalez.",
   "Quand cela se lit bien, nous l’activons pour tous.",
  ],
  ctaTitle: "Tout commence sur le Discord.",
  ctaBody:
   "Aucun diplôme de théologie requis. Il nous faut un lecteur natif attentif qui sait comment l’Église parle dans votre langue. Venez dire bonjour et nommez votre langue.",
  cta: "Rejoindre le Discord →",
  closing: "Une langue à la fois. La vôtre, peut-être, la prochaine.",
 },
 es: {
  eyebrow: "Conviértete en editor de idioma",
  h1: "Te necesitamos.",
  lead: "Purify aún no habla tu idioma. Ahí es donde entras tú.",
  reason:
   "Los santos, las Escrituras, las oraciones y el calendario están hoy en inglés y alemán. Preferimos no publicar nada antes que una traducción automática de una teología que nadie ha leído.",
  workTitle: "En qué consiste",
  workBody:
   "No traduces toda la aplicación. Nosotros creamos la traducción de tu idioma; tú la revisas. Lees tu propia lengua con ojo atento, detectas lo que suena mal en las oraciones y nos lo dices. Lo corregimos y se publica.",
  howTitle: "Cómo funciona",
  steps: [
   "Únete a nuestro Discord.",
   "Dinos qué idioma llevarías.",
   "Te enviamos un borrador de la aplicación en ese idioma.",
   "Tú lo revisas; nosotros corregimos lo que señales.",
   "Cuando se lee bien, lo activamos para todos.",
  ],
  ctaTitle: "Empieza en el Discord.",
  ctaBody:
   "No hace falta un título en teología. Necesitamos a un lector nativo atento que sepa cómo habla la Iglesia en tu idioma. Ven, saluda y dinos tu idioma.",
  cta: "Únete al Discord →",
  closing: "Un idioma a la vez. Quizá el tuyo sea el próximo.",
 },
 ro: {
  eyebrow: "Devino editor de limbă",
  h1: "Avem nevoie de tine.",
  lead: "Purify încă nu vorbește limba ta. Aici intervii tu.",
  reason:
   "Sfinții, Scripturile, rugăciunile și calendarul sunt astăzi în engleză și germană. Preferăm să nu publicăm nimic decât o traducere automată a unei teologii pe care nimeni nu a citit-o.",
  workTitle: "În ce constă",
  workBody:
   "Nu traduci toată aplicația. Noi facem traducerea pentru limba ta; tu o revizuiești. Îți citești propria limbă cu ochi atent, observi ce sună greșit în rugăciuni și ne spui. Noi corectăm, și se publică.",
  howTitle: "Cum funcționează",
  steps: [
   "Intră pe Discordul nostru.",
   "Spune-ne ce limbă ai purta.",
   "Îți trimitem o ciornă a aplicației în acea limbă.",
   "Tu o revizuiești; noi corectăm ce semnalezi.",
   "Când se citește bine, o activăm pentru toți.",
  ],
  ctaTitle: "Începe pe Discord.",
  ctaBody:
   "Nu e nevoie de diplomă în teologie. Avem nevoie de un cititor nativ atent care știe cum vorbește Biserica în limba ta. Vino să saluți și spune-ne limba ta.",
  cta: "Intră pe Discord →",
  closing: "O limbă pe rând. Poate a ta urmează.",
 },
 el: {
  eyebrow: "Γίνετε επιμελητής γλώσσας",
  h1: "Σας χρειαζόμαστε.",
  lead: "Το Purify δεν μιλά ακόμη τη γλώσσα σας. Εκεί μπαίνετε εσείς.",
  reason:
   "Οι άγιοι, οι Γραφές, οι προσευχές και το ημερολόγιο είναι σήμερα στα αγγλικά και τα γερμανικά. Προτιμούμε να μη δημοσιεύσουμε τίποτα παρά μια αυτόματη μετάφραση μιας θεολογίας που κανείς δεν έχει διαβάσει.",
  workTitle: "Σε τι συνίσταται",
  workBody:
   "Δεν μεταφράζετε όλη την εφαρμογή. Εμείς φτιάχνουμε τη μετάφραση της γλώσσας σας· εσείς την ελέγχετε. Διαβάζετε τη γλώσσα σας με προσεκτικό μάτι, εντοπίζετε τι ακούγεται λάθος στις προσευχές και μας το λέτε. Εμείς το διορθώνουμε, και δημοσιεύεται.",
  howTitle: "Πώς λειτουργεί",
  steps: [
   "Μπείτε στο Discord μας.",
   "Πείτε μας ποια γλώσσα θα αναλαμβάνατε.",
   "Σας στέλνουμε ένα προσχέδιο της εφαρμογής σε αυτή τη γλώσσα.",
   "Εσείς το ελέγχετε· εμείς διορθώνουμε ό,τι επισημάνετε.",
   "Όταν διαβάζεται σωστά, το ενεργοποιούμε για όλους.",
  ],
  ctaTitle: "Ξεκινά στο Discord.",
  ctaBody:
   "Δεν χρειάζεται πτυχίο θεολογίας. Χρειαζόμαστε έναν προσεκτικό φυσικό ομιλητή που ξέρει πώς μιλά η Εκκλησία στη γλώσσα σας. Ελάτε να πείτε ένα γεια και πείτε μας τη γλώσσα σας.",
  cta: "Μπείτε στο Discord →",
  closing: "Μία γλώσσα κάθε φορά. Ίσως η δική σας η επόμενη.",
 },
 ru: {
  eyebrow: "Станьте редактором языка",
  h1: "Вы нам нужны.",
  lead: "Purify пока не говорит на вашем языке. Здесь и нужны вы.",
  reason:
   "Святые, Писания, молитвы и календарь сегодня доступны на английском и немецком. Мы лучше не выпустим ничего, чем машинный перевод богословия, которого никто не читал.",
  workTitle: "В чём задача",
  workBody:
   "Вы не переводите всё приложение. Мы делаем перевод вашего языка; вы его проверяете. Вы читаете родной язык внимательным взглядом, замечаете, что звучит неверно в молитвах, и сообщаете нам. Мы исправляем, и это выходит в свет.",
  howTitle: "Как это работает",
  steps: [
   "Присоединяйтесь к нашему Discord.",
   "Скажите, какой язык вы возьмёте.",
   "Мы пришлём вам черновик приложения на этом языке.",
   "Вы его проверяете; мы исправляем то, что вы отметили.",
   "Когда всё читается верно, мы включаем его для всех.",
  ],
  ctaTitle: "Всё начинается в Discord.",
  ctaBody:
   "Богословского образования не требуется. Нам нужен внимательный носитель языка, который знает, как Церковь говорит на вашем языке. Зайдите, поздоровайтесь и назовите свой язык.",
  cta: "Войти в Discord →",
  closing: "По одному языку за раз. Возможно, ваш — следующий.",
 },
 uk: {
  eyebrow: "Станьте редактором мови",
  h1: "Ви нам потрібні.",
  lead: "Purify ще не розмовляє вашою мовою. Саме тут потрібні ви.",
  reason:
   "Святі, Писання, молитви та календар сьогодні доступні англійською та німецькою. Ми краще не випустимо нічого, ніж машинний переклад богослов’я, якого ніхто не читав.",
  workTitle: "У чому полягає робота",
  workBody:
   "Ви не перекладаєте весь застосунок. Ми робимо переклад вашою мовою; ви його перевіряєте. Ви читаєте рідну мову уважним оком, помічаєте, що звучить неправильно в молитвах, і повідомляєте нам. Ми виправляємо, і це виходить у світ.",
  howTitle: "Як це працює",
  steps: [
   "Приєднуйтеся до нашого Discord.",
   "Скажіть, яку мову ви взяли б.",
   "Ми надішлемо вам чернетку застосунку цією мовою.",
   "Ви її перевіряєте; ми виправляємо те, що ви зазначите.",
   "Коли все читається правильно, ми вмикаємо її для всіх.",
  ],
  ctaTitle: "Усе починається в Discord.",
  ctaBody:
   "Богословської освіти не потрібно. Нам потрібен уважний носій мови, який знає, як Церква говорить вашою мовою. Завітайте, привітайтеся й назвіть свою мову.",
  cta: "Увійти в Discord →",
  closing: "По одній мові за раз. Можливо, ваша — наступна.",
 },
 sr: {
  eyebrow: "Постаните уредник језика",
  h1: "Потребни сте нам.",
  lead: "Purify још не говори ваш језик. Ту наступате ви.",
  reason:
   "Свети, Свето писмо, молитве и календар данас су на енглеском и немачком. Радије нећемо објавити ништа него машински превод богословља које нико није прочитао.",
  workTitle: "У чему је посао",
  workBody:
   "Не преводите целу апликацију. Ми правимо превод вашег језика; ви га прегледате. Читате свој језик пажљивим оком, уочавате шта звучи погрешно у молитвама и јавите нам. Ми исправимо, и објави се.",
  howTitle: "Како функционише",
  steps: [
   "Придружите се нашем Discord-у.",
   "Реците нам који бисте језик понели.",
   "Шаљемо вам нацрт апликације на том језику.",
   "Ви га прегледате; ми исправљамо оно што означите.",
   "Када се добро чита, укључимо га за све.",
  ],
  ctaTitle: "Почиње на Discord-у.",
  ctaBody:
   "Није потребна диплома из богословља. Потребан нам је пажљив изворни говорник који зна како Црква говори на вашем језику. Дођите, поздравите и реците свој језик.",
  cta: "Придружи се Discord-у →",
  closing: "Један по један језик. Можда је ваш следећи.",
 },
 it: {
  eyebrow: "Diventa editor di lingua",
  h1: "Abbiamo bisogno di te.",
  lead: "Purify non parla ancora la tua lingua. È qui che entri in gioco tu.",
  reason:
   "I santi, le Scritture, le preghiere e il calendario sono oggi in inglese e tedesco. Preferiamo non pubblicare nulla piuttosto che una traduzione automatica di una teologia che nessuno ha letto.",
  workTitle: "In cosa consiste",
  workBody:
   "Non traduci tutta l’app. Noi creiamo la traduzione della tua lingua; tu la revisioni. Leggi la tua lingua con occhio attento, cogli ciò che suona male nelle preghiere e ce lo segnali. Noi correggiamo, e va online.",
  howTitle: "Come funziona",
  steps: [
   "Unisciti al nostro Discord.",
   "Dicci quale lingua porteresti.",
   "Ti inviamo una bozza dell’app in quella lingua.",
   "Tu la revisioni; noi correggiamo ciò che segnali.",
   "Quando si legge bene, la attiviamo per tutti.",
  ],
  ctaTitle: "Si comincia su Discord.",
  ctaBody:
   "Non serve una laurea in teologia. Ci serve un lettore madrelingua attento che sappia come parla la Chiesa nella tua lingua. Vieni a salutarci e dicci la tua lingua.",
  cta: "Entra nel Discord →",
  closing: "Una lingua alla volta. Magari la tua è la prossima.",
 },
 pt: {
  eyebrow: "Torne-se editor de idioma",
  h1: "Precisamos de você.",
  lead: "O Purify ainda não fala o seu idioma. É aí que você entra.",
  reason:
   "Os santos, as Escrituras, as orações e o calendário estão hoje em inglês e alemão. Preferimos não publicar nada a publicar uma tradução automática de uma teologia que ninguém leu.",
  workTitle: "Em que consiste",
  workBody:
   "Você não traduz o aplicativo inteiro. Nós criamos a tradução do seu idioma; você a revisa. Lê a sua própria língua com olhar atento, percebe o que soa errado nas orações e nos avisa. Nós corrigimos, e entra no ar.",
  howTitle: "Como funciona",
  steps: [
   "Entre no nosso Discord.",
   "Diga-nos qual idioma você levaria.",
   "Enviamos um rascunho do aplicativo nesse idioma.",
   "Você revisa; nós corrigimos o que você apontar.",
   "Quando estiver bem, ativamos para todos.",
  ],
  ctaTitle: "Começa no Discord.",
  ctaBody:
   "Não é preciso diploma em teologia. Precisamos de um leitor nativo atento que saiba como a Igreja fala no seu idioma. Venha dizer olá e diga o seu idioma.",
  cta: "Entrar no Discord →",
  closing: "Um idioma de cada vez. Talvez o seu seja o próximo.",
 },
 bg: {
  eyebrow: "Станете езиков редактор",
  h1: "Имаме нужда от вас.",
  lead: "Purify все още не говори на вашия език. Тук идвате вие.",
  reason:
   "Светците, Писанията, молитвите и календарът днес са на английски и немски. Предпочитаме да не публикуваме нищо, отколкото машинен превод на богословие, което никой не е чел.",
  workTitle: "В какво се състои",
  workBody:
   "Вие не превеждате цялото приложение. Ние правим превода на вашия език; вие го преглеждате. Четете родния си език с внимателно око, забелязвате какво звучи погрешно в молитвите и ни казвате. Ние поправяме и то се публикува.",
  howTitle: "Как работи",
  steps: [
   "Присъединете се към нашия Discord.",
   "Кажете ни кой език бихте поели.",
   "Изпращаме ви чернова на приложението на този език.",
   "Вие я преглеждате; ние поправяме това, което посочите.",
   "Когато се чете правилно, го включваме за всички.",
  ],
  ctaTitle: "Започва в Discord.",
  ctaBody:
   "Не е нужна богословска степен. Нужен ни е внимателен носител на езика, който знае как Църквата говори на вашия език. Елате, поздравете и кажете своя език.",
  cta: "Влез в Discord →",
  closing: "По един език наведнъж. Може би вашият е следващият.",
 },
 ar: {
  eyebrow: "كن محرّرًا للغة",
  h1: "نحتاج إليك.",
  lead: "لا يتحدث Purify لغتك بعد. هنا يأتي دورك.",
  reason:
   "القديسون والكتب المقدسة والصلوات والتقويم متوفرة اليوم بالإنجليزية والألمانية. نفضّل ألا ننشر شيئًا على أن ننشر ترجمة آلية للاهوت لم يقرأه أحد.",
  workTitle: "في ماذا يتمثّل العمل",
  workBody:
   "أنت لا تترجم التطبيق كله. نحن نُعدّ ترجمة لغتك؛ وأنت تراجعها. تقرأ لغتك بعين فاحصة، وتلاحظ ما يبدو خاطئًا في الصلوات وتخبرنا. نحن نصحّحه، ثم يُنشر.",
  howTitle: "كيف يعمل الأمر",
  steps: [
   "انضمّ إلى Discord الخاص بنا.",
   "أخبرنا أي لغة ستحملها.",
   "نرسل إليك مسودة من التطبيق بتلك اللغة.",
   "تراجعها؛ ونصحّح ما تشير إليه.",
   "وعندما تُقرأ بشكل صحيح، نفعّلها للجميع.",
  ],
  ctaTitle: "يبدأ الأمر على Discord.",
  ctaBody:
   "لا حاجة إلى شهادة في اللاهوت. نحتاج إلى قارئ من أبناء اللغة، يقظ، يعرف كيف تتحدث الكنيسة بلغتك. تعال وألقِ التحية وأخبرنا بلغتك.",
  cta: "انضم إلى Discord →",
  closing: "لغة واحدة في كل مرة. ربما لغتك هي التالية.",
 },
};

export default async function LanguageEditorPage({
 searchParams,
}: {
 searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
 const sp = await searchParams;
 const langParam = typeof sp.lang === "string" ? sp.lang : undefined;
 const picked = langParam
  ? LOCALES.find((l) => l.code === langParam)
  : undefined;
 const serverLocale = await getServerLocale();
 // Render in the language the reader picked; fall back to their UI locale.
 const pageLocale: LocaleCode = picked?.code ?? serverLocale;
 const dir = picked?.dir ?? "ltr";
 const c = COPY[pageLocale] ?? COPY.en;

 return (
  <section className={`${SECTION} bg-night`} dir={dir}>
   <article className="mx-auto max-w-[760px] w-full">
    <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
     {c.eyebrow}
    </p>
    <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
     {c.h1}
    </h1>

    <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
     {c.lead}
    </p>
    <p className="mt-5 font-serif text-body text-paper/80 leading-[1.7]">
     {c.reason}
    </p>

    {/* What it means */}
    <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
     <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
      {c.workTitle}
     </p>
     <p className="font-serif text-body text-paper/85 leading-[1.7]">
      {c.workBody}
     </p>
    </section>

    {/* How it works */}
    <section className="mt-10">
     <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
      {c.howTitle}
     </p>
     <ol className="space-y-3">
      {c.steps.map((s, i) => (
       <li key={i} className="flex items-baseline gap-4">
        <span className="shrink-0 font-sans text-detail font-bold text-gold tabular-nums">
         {i + 1}
        </span>
        <span className="font-serif text-body text-paper/85 leading-[1.65]">
         {s}
        </span>
       </li>
      ))}
     </ol>
    </section>

    {/* Join CTA */}
    <section className="mt-12 rounded-lg border border-gold/35 bg-gold/[0.05] p-6 md:p-8">
     <p className="font-sans text-body font-semibold text-paper leading-tight">
      {c.ctaTitle}
     </p>
     <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
      {c.ctaBody}
     </p>
     <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
     >
      {c.cta}
     </a>
    </section>

    {/* Closing */}
    <p className="mt-14 font-serif italic text-center text-lede text-paper/70">
     {c.closing}
    </p>
   </article>
  </section>
 );
}
