import type { ContentLang } from './content-translator';

export interface ZakatUIStrings {
  title: string;
  shariahRate: string;
  tabCalculator: string;
  tabHistory: string;
  heroBadge: string;
  heroPill: string;
  heroTitle: string;
  heroSub: string;
  rulesBtn: string;
  liveRatesTitle: string;
  overrideBtn: string;
  fineGold24k: string;
  fineSilver999: string;
  nisabSectionTitle: string;
  silverNisab: string;
  recommended: string;
  goldNisab: string;
  std75tola: string;
  nisabNote: string;
  // Wealth sections
  cashTitle: string;
  cashSub: string;
  cashHome: string;
  bankAccounts: string;
  receivables: string;
  goldTitle: string;
  goldSub: string;
  silverTitle: string;
  silverSub: string;
  investmentsTitle: string;
  investmentsSub: string;
  businessTitle: string;
  businessSub: string;
  otherTitle: string;
  otherSub: string;
  ushrTitle: string;
  ushrSub: string;
  livestockTitle: string;
  livestockSub: string;
  debtsTitle: string;
  debtsSub: string;
  // Placeholders & Units
  weightGramsPlaceholder: string;
  weightTolasPlaceholder: string;
  amountPlaceholder: string;
  unitGrams: string;
  unitTolas: string;
  unitValue: string;
  purityLabel: string;
  rainIrrigation: string;
  paidIrrigation: string;
  mixedIrrigation: string;
  harvestPlaceholder: string;
  goatsLabel: string;
  cattleLabel: string;
  camelsLabel: string;
  debtsPlaceholder: string;
  // Summary
  summaryTitle: string;
  resetBtn: string;
  grossWealth: string;
  lessLiabilities: string;
  netWealth: string;
  activeNisabLabel: string;
  nisabReached: string;
  belowNisab: string;
  enterAssetsHint: string;
  zakatDueTitle: string;
  monthlyOpt: string;
  saveHistoryBtn: string;
  shareBtn: string;
  // History
  savedCalculations: string;
  clearAll: string;
  noHistoryTitle: string;
  noHistorySub: string;
  goToCalc: string;
  paidBadge: string;
  markPaidBtn: string;
  loadBtn: string;
  // Shariah rules modal
  rulesModalTitle: string;
  rulesWhatIsZakat: string;
  rulesWhatIsZakatDesc: string;
  rulesWhoMustPay: string;
  rulesWhoMustPayDesc: string;
  rulesNisab: string;
  rulesNisabDesc: string;
  rulesExempt: string;
  rulesExemptDesc: string;
  rulesRecipients: string;
  rulesRecipientsDesc: string;
  closeBtn: string;
}

const STRINGS: Record<ContentLang, ZakatUIStrings> = {
  en: {
    title: 'Zakat Calculator',
    shariahRate: 'Shariah 2.5%',
    tabCalculator: 'Calculator',
    tabHistory: 'History',
    heroBadge: '♡ ZAKAT AL-MĀL',
    heroPill: '2.5% (1/40th)',
    heroTitle: 'Purify Your Wealth',
    heroSub: 'Calculated strictly according to authentic Islamic Shariah (Hawl & Nisab).',
    rulesBtn: '📖 Simple Shariah Rules (Who Must Pay?)',
    liveRatesTitle: 'Live Bullion Rates',
    overrideBtn: 'Override',
    fineGold24k: '24K FINE GOLD',
    fineSilver999: '999 FINE SILVER',
    nisabSectionTitle: 'Select Nisab Threshold Standard',
    silverNisab: 'Silver Nisab',
    recommended: 'Recommended',
    goldNisab: 'Gold Nisab',
    std75tola: '7.5 Tola Std',
    nisabNote: '* Note: Classical Hanafi scholars and contemporary fiqh councils recommend the Silver Nisab for cash and mixed wealth so more aid reaches the poor and needy.',
    cashTitle: '1. Cash & Bank Balances',
    cashSub: 'Cash at home, bank savings, and loans given out',
    cashHome: 'Cash at Home / Hand',
    bankAccounts: 'Bank Balances (Savings / FD)',
    receivables: 'Money Lent (Receivables)',
    goldTitle: '2. Gold (Jewelry, Coins & Bars)',
    goldSub: 'Supports Grams, Tolas & 24K/22K/21K/18K',
    silverTitle: '3. Silver (Utensils, Coins & Bars)',
    silverSub: 'Supports Grams, Tolas & Direct Value',
    investmentsTitle: '4. Investments, Shares & Crypto',
    investmentsSub: 'Stocks, mutual funds, ETFs, Sukuk & crypto portfolio',
    businessTitle: '5. Business Inventory & Goods',
    businessSub: 'Wholesale stock, finished merchandise & goods for resale',
    otherTitle: '6. Other Zakatable Assets',
    otherSub: 'Rental savings, property for resale & withdrawable PF',
    ushrTitle: '7. Agricultural Produce (Ushr)',
    ushrSub: 'Due at harvest if ≥ 653kg (5 Wasq), no 1-yr Hawl wait',
    livestockTitle: '8. Livestock (An\'am Shariah Helper)',
    livestockSub: 'Grazing goats/sheep, cattle/buffaloes, and camels held 1 year',
    debtsTitle: '9. Liabilities & Immediate Debts',
    debtsSub: 'Loans due immediately, unpaid utility bills, rent & unpaid wages',
    weightGramsPlaceholder: 'Weight in grams (e.g. 50)',
    weightTolasPlaceholder: 'Weight in tolas (e.g. 5)',
    amountPlaceholder: '0',
    unitGrams: 'Grams',
    unitTolas: 'Tolas',
    unitValue: 'Direct Value',
    purityLabel: 'Purity:',
    rainIrrigation: 'Rain / River (10%)',
    paidIrrigation: 'Paid / Well (5%)',
    mixedIrrigation: 'Mixed (7.5%)',
    harvestPlaceholder: 'Harvest value in currency',
    goatsLabel: 'GOATS / SHEEP',
    cattleLabel: 'CATTLE / COWS',
    camelsLabel: 'CAMELS',
    debtsPlaceholder: 'Total deductible liabilities due immediately',
    summaryTitle: 'Zakat Al-Māl Calculation Summary',
    resetBtn: 'Reset',
    grossWealth: 'Gross Zakatable Wealth:',
    lessLiabilities: 'Less Deductible Liabilities:',
    netWealth: 'Net Zakatable Wealth:',
    activeNisabLabel: 'Active Nisab Threshold',
    nisabReached: '✓ NISAB REACHED — ZAKAT IS OBLIGATORY (2.5%)',
    belowNisab: 'BELOW NISAB — NO ZAKAT OBLIGATORY',
    enterAssetsHint: 'Enter your assets above to check your Nisab status.',
    zakatDueTitle: 'Zakat Al-Māl Due (2.5%)',
    monthlyOpt: 'Or pay in installments:',
    saveHistoryBtn: 'Save to History',
    shareBtn: 'Share / Copy',
    savedCalculations: 'Saved Calculations',
    clearAll: 'Clear All',
    noHistoryTitle: 'No Saved Calculations Yet',
    noHistorySub: 'When you calculate your Zakat in the Calculator tab, tap Save to History to keep track across lunar years.',
    goToCalc: 'Go to Calculator',
    paidBadge: 'Paid',
    markPaidBtn: 'Mark as Paid',
    loadBtn: 'Load',
    rulesModalTitle: 'Simple Shariah Zakat Rules',
    rulesWhatIsZakat: 'What is Zakat al-Māl?',
    rulesWhatIsZakatDesc: 'Zakat is the third pillar of Islam. It is a mandatory 2.5% (1/40th) purification due annually on qualifying surplus wealth held for one lunar year (Hawl) above the minimum threshold (Nisab).',
    rulesWhoMustPay: '1. Who Must Pay Zakat?',
    rulesWhoMustPayDesc: 'Every adult Muslim who is sane, free, and possesses surplus wealth equal to or greater than the Nisab threshold for a full lunar year (approx. 354 days).',
    rulesNisab: '2. What is Nisab?',
    rulesNisabDesc: 'Nisab is the minimum qualifying wealth threshold: Silver Nisab is 612.36g (52.5 Tola); Gold Nisab is 87.48g (7.5 Tola).',
    rulesExempt: '3. What Assets are EXEMPT? (No Zakat Due)',
    rulesExemptDesc: 'Primary personal residence, personal transport vehicles, daily clothes, furniture, appliances, and tools/machinery of trade.',
    rulesRecipients: '4. Who Receives Zakat? (Surah At-Tawbah 9:60)',
    rulesRecipientsDesc: 'The poor, the needy, zakat administrators, hearts to be reconciled, freeing captives, overburdened debtors, in the cause of Allah, and travelers in need.',
    closeBtn: 'Close & Return',
  },
  ur: {
    title: 'زکوٰۃ کیلکولیٹر',
    shariahRate: 'شرعی 2.5٪',
    tabCalculator: 'کیلکولیٹر',
    tabHistory: 'تاریخچہ',
    heroBadge: '♡ زکوٰۃ المال',
    heroPill: '2.5٪ (چالیسواں حصہ)',
    heroTitle: 'اپنا مال پاک کریں',
    heroSub: 'مستند اسلامی شریعت (حول اور نصاب) کے عین مطابق حساب کریں۔',
    rulesBtn: '📖 آسان شرعی احکام (زکوٰۃ کس پر فرض ہے؟)',
    liveRatesTitle: 'لائیو مارکیٹ ریٹس',
    overrideBtn: 'ریٹ بدلیں',
    fineGold24k: '24 قیراط سونا',
    fineSilver999: '999 چاندی',
    nisabSectionTitle: 'نصاب کا معیار منتخب کریں',
    silverNisab: 'چاندی کا نصاب',
    recommended: 'افضل و مستحب',
    goldNisab: 'سونے کا نصاب',
    std75tola: '7.5 تولہ معیار',
    nisabNote: '* نوٹ: فقہائے احناف اور معاصر فقہی کونسلوں کے مطابق نقدی اور مخلوط مال کے لیے چاندی کا نصاب افضل ہے تاکہ غریبوں کو زیادہ فائدہ پہنچے۔',
    cashTitle: '1. نقد رقم اور بینک بیلنس',
    cashSub: 'گھر پر موجود رقم، بینک کھاتے اور قابل واپسی قرض',
    cashHome: 'گھر پر نقد رقم',
    bankAccounts: 'بینک بیلنس (بچت / فکسڈ)',
    receivables: 'دیا گیا قرض (واپسی متوقع)',
    goldTitle: '2. سونا (زیورات، سکے اور بسکٹ)',
    goldSub: 'گرام، تولہ اور 24K/22K/21K/18K کی سہولت',
    silverTitle: '3. چاندی (برتن، سکے اور سلاخیں)',
    silverSub: 'گرام، تولہ اور براہ راست قیمت',
    investmentsTitle: '4. سرمایہ کاری، شیئرز اور کرپٹو',
    investmentsSub: 'اسٹاکس، میوچل فنڈز، صکوک اور کرپٹو پورٹ فولیو',
    businessTitle: '5. تجارتی مال اور اسٹاک',
    businessSub: 'فروخت کے لیے تیار مال، خام مال اور تجارتی اسٹاک',
    otherTitle: '6. دیگر قابل زکوٰۃ اثاثے',
    otherSub: 'کرایہ کی بچت، تجارت کی غرض سے خریدی گئی جائیداد اور پی ایف',
    ushrTitle: '7. زرعی پیداوار (عشر)',
    ushrSub: 'کٹائی کے وقت واجب، اگر پیداوار 653 کلو (5 وسق) یا زیادہ ہو',
    livestockTitle: '8. مویشی (انعام - شرعی حساب)',
    livestockSub: 'سال بھر چرنے والے بکرے/بکریاں، گائے/بھینس اور اونٹ',
    debtsTitle: '9. فوری واجب الادا قرض اور بل',
    debtsSub: 'فوری طور پر واجب الادا قرضے، بل، کرایہ اور ملازمین کی تنخواہیں',
    weightGramsPlaceholder: 'وزن گرام میں (مثلاً 50)',
    weightTolasPlaceholder: 'وزن تولہ میں (مثلاً 5)',
    amountPlaceholder: '0',
    unitGrams: 'گرام',
    unitTolas: 'تولہ',
    unitValue: 'براہ راست رقم',
    purityLabel: 'قیراط:',
    rainIrrigation: 'بارانی / قدرتی (10٪)',
    paidIrrigation: 'ٹیوب ویل (5٪)',
    mixedIrrigation: 'مخلوط (7.5٪)',
    harvestPlaceholder: 'فصل کی کل مالیت',
    goatsLabel: 'بکریاں / بھیڑ',
    cattleLabel: 'گائے / بھینس',
    camelsLabel: 'اونٹ',
    debtsPlaceholder: 'فوری واجب الادا قرض اور اخراجات',
    summaryTitle: 'زکوٰۃ المال کا حتمی خلاصہ',
    resetBtn: 'دوبارہ شروع',
    grossWealth: 'کل قابل زکوٰۃ مال:',
    lessLiabilities: 'منہا فوری قرض و واجبات:',
    netWealth: 'خالص قابل زکوٰۃ مال:',
    activeNisabLabel: 'موجودہ نصاب کی حد',
    nisabReached: '✓ نصاب مکمل — زکوٰۃ فرض ہے (2.5٪)',
    belowNisab: 'نصاب سے کم — زکوٰۃ فرض نہیں (صدقہ مستحب ہے)',
    enterAssetsHint: 'اپنے اثاثے درج کر کے نصاب کی صورتحال چیک کریں۔',
    zakatDueTitle: 'واجب الادا زکوٰۃ المال (2.5٪)',
    monthlyOpt: 'یا ماہانہ اقساط میں ادا کریں:',
    saveHistoryBtn: 'محفوظ کریں',
    shareBtn: 'شیئر / کاپی',
    savedCalculations: 'محفوظ شدہ ریکارڈ',
    clearAll: 'سب حذف کریں',
    noHistoryTitle: 'کوئی محفوظ شدہ ریکارڈ نہیں',
    noHistorySub: 'جب آپ کیلکولیٹر میں زکوٰۃ کا حساب کریں تو "محفوظ کریں" دبائیں تاکہ سال بہ سال ریکارڈ قائم رہے۔',
    goToCalc: 'کیلکولیٹر پر جائیں',
    paidBadge: 'ادا شدہ',
    markPaidBtn: 'ادا شدہ نشان لگائیں',
    loadBtn: 'لوڈ کریں',
    rulesModalTitle: 'آسان شرعی احکام',
    rulesWhatIsZakat: 'زکوٰۃ المال کیا ہے؟',
    rulesWhatIsZakatDesc: 'زکوٰۃ اسلام کا تیسرا بنیادی رکن ہے۔ یہ ایک قمری سال (حول) مکمل ہونے پر نصاب سے زائد فاضل مال پر سالانہ 2.5٪ (چالیسواں حصہ) ادا کرنا فرض ہے۔',
    rulesWhoMustPay: '1. زکوٰۃ کس پر فرض ہے؟',
    rulesWhoMustPayDesc: 'ہر عاقل، بالغ، آزاد مسلمان جس کی ملکیت میں ضرورتِ اصلیہ سے زائد نصاب کے برابر یا اس سے زیادہ مال پورا ایک قمری سال موجود رہے۔',
    rulesNisab: '2. نصاب کیا ہے؟',
    rulesNisabDesc: 'نصاب وہ کم از کم حد ہے جس پر زکوٰۃ واجب ہوتی ہے: چاندی کا نصاب 612.36 گرام (52.5 تولہ) اور سونے کا نصاب 87.48 گرام (7.5 تولہ) ہے۔',
    rulesExempt: '3. کون سے اثاثے مستثنیٰ ہیں؟ (زکوٰۃ نہیں ہے)',
    rulesExemptDesc: 'ذاتی رہائشی مکان، ذاتی سواری، روزمرہ کے ملبوسات، گھریلو فرنیچر اور سامان، اور پیشہ ورانہ اوزار و مشینری۔',
    rulesRecipients: '4. زکوٰۃ کے مستحقین کون ہیں؟ (سورہ التوبہ 9:60)',
    rulesRecipientsDesc: 'فقراء، مساکین، عاملینِ زکوٰۃ، تالیفِ قلب، غلاموں کی آزادی، قرض دار، فی سبیل اللہ، اور مسافر۔',
    closeBtn: 'بند کریں',
  },
  gu: {
    title: 'ઝકાત કેલ્ક્યુલેટર',
    shariahRate: 'શરઈ 2.5%',
    tabCalculator: 'કેલ્ક્યુલેટર',
    tabHistory: 'ઇતિહાસ',
    heroBadge: '♡ ઝકાત અલ-માલ',
    heroPill: '2.5% (40મો ભાગ)',
    heroTitle: 'તમારું ધન પવિત્ર કરો',
    heroSub: 'પ્રમાણભૂત ઇસ્લામી શરીઅત (હૌલ અને નિસાબ) મુજબ ચોક્કસ ગણતરી.',
    rulesBtn: '📖 સરળ શરઈ નિયમો (ઝકાત કોના પર વાજિબ છે?)',
    liveRatesTitle: 'લાઈવ બુલિયન ભાવો',
    overrideBtn: 'ભાવ બદલો',
    fineGold24k: '24K શુદ્ધ સોનું',
    fineSilver999: '999 શુદ્ધ ચાંદી',
    nisabSectionTitle: 'નિસાબનું ધોરણ પસંદ કરો',
    silverNisab: 'ચાંદીનો નિસાબ',
    recommended: 'ભલામણ કરેલ',
    goldNisab: 'સોનાનો નિસાબ',
    std75tola: '7.5 તોલા માનક',
    nisabNote: '* નોંધ: રોકડ અને મિશ્ર સંપત્તિ માટે ચાંદીનો નિસાબ શ્રેષ્ઠ છે જેથી ગરીબોને વધુ સહાય પહોંચી શકે.',
    cashTitle: '1. રોકડ અને બેંક બેલેન્સ',
    cashSub: 'ઘરની રોકડ, બેંક બચત અને આપેલ ઉછીના નાણાં',
    cashHome: 'ઘરે / હાથમાં રોકડ',
    bankAccounts: 'બેંક બેલેન્સ (બચત / FD)',
    receivables: 'આપેલ ઉધાર (લેણાં)',
    goldTitle: '2. સોનું (દાગીના, સિક્કા અને બાર)',
    goldSub: 'ગ્રામ, તોલા અને 24K/22K/21K/18K સપોર્ટ',
    silverTitle: '3. ચાંદી (વાસણો, સિક્કા અને બાર)',
    silverSub: 'ગ્રામ, તોલા અને સીધી કિંમત સપોર્ટ',
    investmentsTitle: '4. રોકાણ, શેર અને ક્રિપ્ટો',
    investmentsSub: 'શેર, મ્યુચ્યુઅલ ફંડ, સુકુક અને ક્રિપ્ટો પોર્ટફોલિયો',
    businessTitle: '5. વેપારી માલ અને સ્ટોક',
    businessSub: 'વેચાણ માટેનો માલ, કાચો માલ અને સ્ટોક',
    otherTitle: '6. અન્ય ઝકાત યોગ્ય અસ્કયામતો',
    otherSub: 'ભાડાની બચત, વેચાણ માટેની મિલકત અને પીએફ',
    ushrTitle: '7. કૃષિ પેદાશ (ઉશ્ર)',
    ushrSub: 'લણણી સમયે વાજિબ જો ≥ 653 કિગ્રા (5 વસ્ક) હોય',
    livestockTitle: '8. પશુધન (અનઆમ શરઈ ગણતરી)',
    livestockSub: 'ઘાસ ચરતી બકરીઓ, ગાયો/ભેંસો અને ઊંટ',
    debtsTitle: '9. તાત્કાલિક દેવા અને લેણાં',
    debtsSub: 'તરત ચૂકવવાના દેવા, બિલ, ભાડું અને બાકી પગાર',
    weightGramsPlaceholder: 'ગ્રામમાં વજન (દા.ત. 50)',
    weightTolasPlaceholder: 'તોલામાં વજન (દા.ત. 5)',
    amountPlaceholder: '0',
    unitGrams: 'ગ્રામ',
    unitTolas: 'તોલા',
    unitValue: 'સીધી કિંમત',
    purityLabel: 'શુદ્ધતા:',
    rainIrrigation: 'વરસાદ / નદી (10%)',
    paidIrrigation: 'કૂવો / ટ્યુબવેલ (5%)',
    mixedIrrigation: 'મિશ્ર સિંચાઈ (7.5%)',
    harvestPlaceholder: 'લણણીનું કુલ મૂલ્ય',
    goatsLabel: 'બકરી / ઘેટાં',
    cattleLabel: 'ગાય / ભેંસ',
    camelsLabel: 'ઊંટ',
    debtsPlaceholder: 'તરત ચૂકવવાપાત્ર કુલ દેવા',
    summaryTitle: 'ઝકાત અલ-માલ ગણતરી સારાંશ',
    resetBtn: 'રીસેટ',
    grossWealth: 'કુલ ઝકાત યોગ્ય સંપત્તિ:',
    lessLiabilities: 'બાદ કરવા પાત્ર દેવા:',
    netWealth: 'ચોખ્ખી ઝકાત યોગ્ય સંપત્તિ:',
    activeNisabLabel: 'સક્રિય નિસાબ મર્યાદા',
    nisabReached: '✓ નિસાબ પૂર્ણ — ઝકાત વાજિબ છે (2.5%)',
    belowNisab: 'નિસાબથી ઓછું — ઝકાત વાજિબ નથી',
    enterAssetsHint: 'નિસાબ સ્થિતિ તપાસવા માટે તમારી સંપત્તિ દાખલ કરો.',
    zakatDueTitle: 'ચૂકવવા પાત્ર ઝકાત (2.5%)',
    monthlyOpt: 'અથવા માસિક હપ્તામાં ચૂકવો:',
    saveHistoryBtn: 'સાચવો',
    shareBtn: 'શેર / કોપી',
    savedCalculations: 'સાચવેલ ગણતરીઓ',
    clearAll: 'બધું સાફ કરો',
    noHistoryTitle: 'હજુ કોઈ સાચવેલ ગણતરી નથી',
    noHistorySub: 'જ્યારે તમે ઝકાતની ગણતરી કરો ત્યારે સાચવો પર ટેપ કરો જેથી વર્ષોનો રેકોર્ડ સચવાઈ રહે.',
    goToCalc: 'કેલ્ક્યુલેટર પર જાઓ',
    paidBadge: 'ચૂકવેલ',
    markPaidBtn: 'ચૂકવેલ માર્ક કરો',
    loadBtn: 'લોડ કરો',
    rulesModalTitle: 'સરળ શરઈ ઝકાત નિયમો',
    rulesWhatIsZakat: 'ઝકાત અલ-માલ શું છે?',
    rulesWhatIsZakatDesc: 'ઝકાત ઇસ્લામનો ત્રીજો આધારસ્તંભ છે. નિસાબથી વધુ બચત પર એક ચંદ્ર વર્ષ (હૌલ) પૂર્ણ થતાં વાર્ષિક 2.5% પવિત્રતા દાન આપવું ફરજિયાત છે.',
    rulesWhoMustPay: '1. ઝકાત કોના પર વાજિબ છે?',
    rulesWhoMustPayDesc: 'દરેક પુખ્ત, બુદ્ધિશાળી અને આઝાદ મુસ્લિમ જેની પાસે નિસાબ બરાબર ધન પૂરા એક ચંદ્ર વર્ષ માટે રહ્યું હોય.',
    rulesNisab: '2. નિસાબ શું છે?',
    rulesNisabDesc: 'નિસાબ એ લઘુત્તમ મર્યાદા છે: ચાંદીનો નિસાબ 612.36 ગ્રામ (52.5 તોલા) અને સોનાનો નિસાબ 87.48 ગ્રામ (7.5 તોલા) છે.',
    rulesExempt: '3. કઈ વસ્તુઓ પર ઝકાત નથી? (મુક્ત સંપત્તિ)',
    rulesExemptDesc: 'રહેવાનું અંગત ઘર, અંગત વાહન, રોજિંદા કપડાં, ઘરવખરી અને વ્યવસાયના અંગત સાધનો/મશીનરી.',
    rulesRecipients: '4. ઝકાતના હકદાર કોણ છે? (સૂરહ અત-તૌબાહ 9:60)',
    rulesRecipientsDesc: 'ગરીબો, જરૂરિયાતમંદો, ઝકાત વહીવટકર્તાઓ, દિલ જોડવા માટે, ગુલામોની મુક્તિ, દેવાદારો, અલ્લાહના માર્ગમાં અને મુસાફરો.',
    closeBtn: 'બંધ કરો',
  },
  hi: {
    title: 'ज़कात कैलकुलेटर',
    shariahRate: 'शरई 2.5%',
    tabCalculator: 'कैलकुलेटर',
    tabHistory: 'इतिहास',
    heroBadge: '♡ ज़कात अल-माल',
    heroPill: '2.5% (40वाँ हिस्सा)',
    heroTitle: 'अपना धन पवित्र करें',
    heroSub: 'प्रामाणिक इस्लामी शरीयत (हौल और निसाब) के अनुसार सटीक गणना।',
    rulesBtn: '📖 आसान शरई नियम (ज़कात किस पर फ़र्ज़ है?)',
    liveRatesTitle: 'लाइव बुलियन दरें',
    overrideBtn: 'दर बदलें',
    fineGold24k: '24K शुद्ध सोना',
    fineSilver999: '999 शुद्ध चांदी',
    nisabSectionTitle: 'निसाब का मानक चुनें',
    silverNisab: 'चांदी का निसाब',
    recommended: 'अनुशंसित',
    goldNisab: 'सोने का निसाब',
    std75tola: '7.5 तोला मानक',
    nisabNote: '* नोट: नकद और मिश्रित संपत्ति के लिए चांदी का निसाब उत्तम है ताकि गरीबों को अधिक सहायता मिल सके।',
    cashTitle: '1. नकद और बैंक बैलेंस',
    cashSub: 'घर पर नकद, बैंक बचत और दिया गया ऋण',
    cashHome: 'घर पर नकद राशि',
    bankAccounts: 'बैंक बैलेंस (बचत / FD)',
    receivables: 'दिया गया कर्ज (प्राप्य)',
    goldTitle: '2. सोना (गहने, सिक्के और बार)',
    goldSub: 'ग्राम, तोला और 24K/22K/21K/18K सपोर्ट',
    silverTitle: '3. चांदी (बर्तन, सिक्के और बार)',
    silverSub: 'ग्राम, तोला और सीधा मूल्य सपोर्ट',
    investmentsTitle: '4. निवेश, शेयर्स और क्रिप्टो',
    investmentsSub: 'शेयर, म्यूचुअल फंड, सुकूक और क्रिप्टो पोर्टफोलियो',
    businessTitle: '5. व्यावसायिक माल और स्टॉक',
    businessSub: 'बिक्री हेतु तैयार माल, कच्चा माल और व्यापारिक स्टॉक',
    otherTitle: '6. अन्य ज़कात योग्य संपत्तियां',
    otherSub: 'किराये की बचत, बिक्री हेतु संपत्ति और भविष्य निधि',
    ushrTitle: '7. कृषि उपज (उश्र)',
    ushrSub: 'कटाई के समय वाजिब यदि उपज ≥ 653 किग्रा (5 वस्क) हो',
    livestockTitle: '8. पशुधन (अनआम शरई गणना)',
    livestockSub: 'घास चरने वाली बकरियां, गाय/भैंस और ऊंट',
    debtsTitle: '9. तत्काल देय ऋण और बिल',
    debtsSub: 'तुरंत देय ऋण, बिल, किराया और कर्मचारियों का बकाया वेतन',
    weightGramsPlaceholder: 'ग्राम में वजन (उदा. 50)',
    weightTolasPlaceholder: 'तोला में वजन (उदा. 5)',
    amountPlaceholder: '0',
    unitGrams: 'ग्राम',
    unitTolas: 'तोला',
    unitValue: 'सीधा मूल्य',
    purityLabel: 'शुद्धता:',
    rainIrrigation: 'वर्षा / प्राकृतिक (10%)',
    paidIrrigation: 'नलकूप / सिंचित (5%)',
    mixedIrrigation: 'मिश्रित सिंचाई (7.5%)',
    harvestPlaceholder: 'उपज का कुल मूल्य',
    goatsLabel: 'बकरी / भेड़',
    cattleLabel: 'गाय / भैंस',
    camelsLabel: 'ऊंट',
    debtsPlaceholder: 'तुरंत देय कुल देनदारियां',
    summaryTitle: 'ज़कात अल-माल गणना सारांश',
    resetBtn: 'रीसेट',
    grossWealth: 'कुल ज़कात योग्य संपत्ति:',
    lessLiabilities: 'घटाने योग्य देयताएं:',
    netWealth: 'शुद्ध ज़कात योग्य संपत्ति:',
    activeNisabLabel: 'सक्रिय निसाब सीमा',
    nisabReached: '✓ निसाब पूर्ण — ज़कात फ़र्ज़ है (2.5%)',
    belowNisab: 'निसाब से कम — ज़कात फ़र्ज़ नहीं',
    enterAssetsHint: 'निसाब स्थिति जांचने के लिए अपनी संपत्ति दर्ज करें।',
    zakatDueTitle: 'देय ज़कात अल-माल (2.5%)',
    monthlyOpt: 'या मासिक किस्तों में अदा करें:',
    saveHistoryBtn: 'सहेजें',
    shareBtn: 'शेयर / कॉपी',
    savedCalculations: 'सहेजी गई गणनाएं',
    clearAll: 'सभी हटाएं',
    noHistoryTitle: 'अभी कोई सहेजी गई गणना नहीं',
    noHistorySub: 'जब आप ज़कात की गणना करें तो सहेजें पर टैप करें ताकि सालों का रिकॉर्ड सुरक्षित रहे।',
    goToCalc: 'कैलकुलेटर पर जाएं',
    paidBadge: 'अदा किया',
    markPaidBtn: 'अदा किया मार्क करें',
    loadBtn: 'लोड करें',
    rulesModalTitle: 'आसान शरई ज़कात नियम',
    rulesWhatIsZakat: 'ज़कात अल-माल क्या है?',
    rulesWhatIsZakatDesc: 'ज़कात इस्लाम का तीसरा स्तंभ है। निसाब से अधिक अतिरिक्त धन पर एक चंद्र वर्ष (हौल) बीतने पर 2.5% दान अनिवार्य है।',
    rulesWhoMustPay: '1. ज़कात किस पर फ़र्ज़ है?',
    rulesWhoMustPayDesc: 'प्रत्येक वयस्क, समझदार और स्वतंत्र मुस्लिम जिसके पास निसाब के बराबर या अधिक धन पूरे एक चंद्र वर्ष तक रहा हो।',
    rulesNisab: '2. निसाब क्या है?',
    rulesNisabDesc: 'निसाब वह न्यूनतम सीमा है: चांदी का निसाब 612.36 ग्राम (52.5 तोला) और सोने का निसाब 87.48 ग्राम (7.5 तोला) है।',
    rulesExempt: '3. किन संपत्तियों पर ज़कात नहीं है? (मुक्त वस्तुएं)',
    rulesExemptDesc: 'व्यक्तिगत निवास का घर, निजी वाहन, दैनिक कपड़े, घरेलू फर्नीचर, और व्यापार/कामकाज के उपकरण एवं मशीनरी।',
    rulesRecipients: '4. ज़कात के हकदार कौन हैं? (सूरह अत-तौबा 9:60)',
    rulesRecipientsDesc: 'गरीब, जरूरतमंद, ज़कात संग्रहकर्ता, दिल मिलाने हेतु, दासों की मुक्ति, कर्जदार, अल्लाह की राह में और मुसाफिर।',
    closeBtn: 'बंद करें',
  },
};

export function getZakatUIStrings(lang: ContentLang): ZakatUIStrings {
  return STRINGS[lang] || STRINGS.en;
}
