import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Info, 
  Plus, 
  Minus, 
  History,
  Download,
  Share2,
  Bell,
  Wallet,
  User
} from "lucide-react";
import { motion } from "framer-motion";

interface FamilyMember {
  id: string;
  name: string;
  age: 'adult' | 'child';
  fitranaAmount?: number;
}

interface PaymentRecord {
  id: string;
  year: number;
  totalAmount: number;
  familyMembers: number;
  paymentDate?: string;
  recipient?: string;
  paid: boolean;
}

interface FitranaData {
  familyMembers: FamilyMember[];
  pricePerKg: number;
  calculationMethod: 'weight' | 'saa' | 'amount';
  currency: string;
  paymentHistory: PaymentRecord[];
}

const FITRANA_STORAGE_KEY = 'fitrana-calculator-data';
const DEFAULT_PRICE_PER_KG = 100; // PKR
const SA_TO_KG = 2.5; // 1 Saa = 2.5 kg

// Islamic calculation methods
const CALCULATION_METHODS = [
  { value: 'weight', label: 'By Weight (2.5kg per person)', description: 'Standard Islamic calculation' },
  { value: 'saa', label: 'By Saa (traditional measure)', description: 'Traditional Islamic measurement' },
  { value: 'amount', label: 'By Amount', description: 'Direct amount entry' }
];

// Currencies
const CURRENCIES = [
  { value: 'PKR', label: 'Pakistani Rupee (PKR)', symbol: 'Rs.' },
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)', symbol: 'SR' }
];

export default function FitranaCalculator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEidAlFitr, isEidAlAdha, islamicInfo, isLoading } = useIslamicCalendar();

  // Determine if Fitrana calculator should be shown (1 week before, during, 1 week after Eid)
  const shouldShow = useMemo(() => {
    if (isLoading || !islamicInfo) return false;
    
    const hijriMonth = islamicInfo.hijriMonth;
    const hijriDay = islamicInfo.hijriDay;
    
    // 1 week before Eid al-Fitr (23-30 Ramadan)
    if (hijriMonth === 9 && hijriDay >= 23) return true;
    
    // Eid al-Fitr period (1-3 Shawwal)
    if (isEidAlFitr && hijriMonth === 10 && hijriDay <= 3) return true;
    
    // 1 week after Eid al-Fitr (4-10 Shawwal)
    if (hijriMonth === 10 && hijriDay >= 4 && hijriDay <= 10) return true;
    
    return false;
  }, [isLoading, islamicInfo, isEidAlFitr, isEidAlAdha]);

  const [fitranaData, setFitranaData] = useState<FitranaData>(() => ({
    familyMembers: [{ id: '1', name: '', age: 'adult' }],
    pricePerKg: DEFAULT_PRICE_PER_KG,
    calculationMethod: 'weight',
    currency: 'PKR',
    paymentHistory: []
  }));

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem(FITRANA_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFitranaData(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.error('Failed to parse saved Fitrana data');
      }
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(FITRANA_STORAGE_KEY, JSON.stringify(fitranaData));
  }, [fitranaData]);

  // Calculate Fitrana amounts
  const calculateFitrana = useMemo(() => {
    const { familyMembers, pricePerKg, calculationMethod } = fitranaData;
    
    return familyMembers.map(member => {
      let amount = 0;
      
      if (calculationMethod === 'weight') {
        amount = 2.5 * pricePerKg; // 2.5kg per person
      } else if (calculationMethod === 'saa') {
        amount = SA_TO_KG * pricePerKg; // 1 Saa = 2.5kg
      } else {
        amount = member.fitranaAmount || 0; // Direct amount
      }
      
      return { ...member, fitranaAmount: amount };
    });
  }, [fitranaData]);

  const totalFitrana = useMemo(() => {
    return calculateFitrana.reduce((sum, member) => sum + (member.fitranaAmount || 0), 0);
  }, [calculateFitrana]);

  const currencySymbol = useMemo(() => {
    const currency = CURRENCIES.find(c => c.value === fitranaData.currency);
    return currency?.symbol || 'Rs.';
  }, [fitranaData.currency]);

  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return `${currencySymbol} ${amount.toFixed(2)}`;
    };
  }, [currencySymbol]);

  // Add family member
  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      age: 'adult'
    };
    setFitranaData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, newMember]
    }));
  };

  // Remove family member
  const removeFamilyMember = (id: string) => {
    setFitranaData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter(member => member.id !== id)
    }));
  };

  // Update family member
  const updateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFitranaData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map(member => 
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  // Mark as paid
  const markAsPaid = () => {
    const currentYear = new Date().getFullYear();
    const newRecord: PaymentRecord = {
      id: Date.now().toString(),
      year: currentYear,
      totalAmount: totalFitrana,
      familyMembers: fitranaData.familyMembers.length,
      paymentDate: new Date().toISOString(),
      paid: true
    };

    setFitranaData(prev => ({
      ...prev,
      paymentHistory: [...prev.paymentHistory, newRecord]
    }));

    toast({
      title: "✅ Fitrana Paid!",
      description: `Successfully recorded ${formatCurrency(totalFitrana)} for ${fitranaData.familyMembers.length} family members.`,
    });
  };

  // Export payment history
  const exportHistory = () => {
    const history = fitranaData.paymentHistory;
    const csvContent = [
      ['Year', 'Family Members', 'Total Amount', 'Payment Date', 'Status'],
      ...history.map(record => [
        record.year,
        record.familyMembers,
        `${currencySymbol} ${record.totalAmount.toFixed(2)}`,
        record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '',
        record.paid ? 'Paid' : 'Unpaid'
      ])
    ].map(row => row.join(','));

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitrana-history-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Payment history exported successfully.",
    });
  };

  // Share calculation
  const shareCalculation = () => {
    const text = `Fitrana Calculation:\nFamily Members: ${fitranaData.familyMembers.length}\nTotal Amount: ${formatCurrency(totalFitrana)}\nCalculation Method: ${fitranaData.calculationMethod}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Fitrana Calculation',
        text: text
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Calculation details copied successfully.",
      });
    }
  };

  // If not in Fitrana period, show message
  if (!shouldShow) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
          <AppBar title="Fitrana Calculator" showBack={true} />
          
          <div className="max-w-lg mx-auto p-4 sm:p-5">
            <div className="relative overflow-hidden rounded-[24px] p-8 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-900/5 min-h-[50vh] flex flex-col items-center justify-center">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
              
              <div className="flex flex-col items-center space-y-5">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-inner">
                  <Calculator className="w-10 h-10 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Calculator Unavailable</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                    The Zakat al-Fitr Calculator is only available during the end of Ramadan until Eid al-Fitr prayer.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/services')}
                  className="mt-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 font-bold px-8"
                >
                  Back to Services
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
        <AppBar title="Overview" showBack={true} />

        <div className="max-w-lg mx-auto p-4 sm:p-5 space-y-5">
          {/* Enhanced Info Card */}
          <div className="relative overflow-hidden rounded-[24px] p-5 bg-gradient-to-br from-emerald-500/15 via-emerald-600/5 to-transparent border border-emerald-500/20 shadow-lg shadow-emerald-900/5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Info className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-900 dark:text-white">About Zakat al-Fitr</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Zakat al-Fitr is compulsory charity given before Eid prayer to purify fasting Muslims. 
                  It's typically calculated as 2.5kg of wheat or equivalent value per family member.
                </p>
              </div>
            </div>
          </div>

          {/* Calculator Settings */}
          <div className="relative overflow-hidden rounded-[24px] p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-900/5 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors duration-500 pointer-events-none" />
            
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4338ca] shadow-md shadow-indigo-500/30 text-white shrink-0">
                  <Calculator className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Calculator Settings</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Calculation Method</Label>
                <Select 
                  value={fitranaData.calculationMethod} 
                  onValueChange={(value: 'weight' | 'saa' | 'amount') => 
                    setFitranaData(prev => ({ ...prev, calculationMethod: value }))
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
                    {CALCULATION_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value} className="py-3 focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg cursor-pointer">
                        <div>
                          <div className="font-bold">{method.label}</div>
                          <div className="text-xs font-medium text-slate-500">{method.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Currency</Label>
                  <Select 
                    value={fitranaData.currency} 
                    onValueChange={(value) => setFitranaData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency.value} value={currency.value} className="py-2.5 rounded-lg cursor-pointer">
                          <span className="font-medium">{currency.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Price per kg ({fitranaData.currency})</Label>
                  <Input
                    type="number"
                    value={fitranaData.pricePerKg}
                    onChange={(e) => setFitranaData(prev => ({ 
                      ...prev, 
                      pricePerKg: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Enter price"
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Family Members */}
          <div className="relative overflow-hidden rounded-[24px] p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-900/5 group">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-500 pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] shadow-md shadow-blue-500/30 text-white shrink-0">
                  <Users className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Family Members</h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{fitranaData.familyMembers.length} Person(s)</p>
                </div>
              </div>

              <div className="space-y-3">
                {fitranaData.familyMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row items-start sm:items-stretch gap-3 p-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm"
                  >
                    <div className="hidden sm:flex p-2.5 h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    
                    <div className="flex-1 w-full space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Name</Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateFamilyMember(member.id, 'name', e.target.value)}
                            placeholder="Enter name"
                            className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Age Type</Label>
                          <Select 
                            value={member.age}
                            onValueChange={(value: 'adult' | 'child') => 
                              updateFamilyMember(member.id, 'age', value)
                            }
                          >
                            <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-slate-700">
                              <SelectItem value="adult" className="cursor-pointer">Adult</SelectItem>
                              <SelectItem value="child" className="cursor-pointer">Child</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {fitranaData.calculationMethod === 'amount' && (
                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Fitrana Amount ({fitranaData.currency})</Label>
                          <Input
                            type="number"
                            value={member.fitranaAmount || ''}
                            onChange={(e) => updateFamilyMember(member.id, 'fitranaAmount', parseFloat(e.target.value) || 0)}
                            placeholder="Enter amount"
                            className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(calculateFitrana[index]?.fitranaAmount || 0)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFamilyMember(member.id)}
                        className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg mt-0 sm:mt-1 hidden sm:flex"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFamilyMember(member.id)}
                        className="h-8 px-3 text-rose-500 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg sm:hidden flex items-center gap-1"
                      >
                        <Minus className="w-3.5 h-3.5" /> Remove
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={addFamilyMember}
                className="w-full h-12 rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={2.5} />
                Add Family Member
              </Button>
            </div>
          </div>

          {/* Premium Total Result Card */}
          <div className="relative overflow-hidden rounded-[24px] p-8 bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-xl shadow-emerald-900/20 group text-white text-center">
            {/* Elegant Light Gradients */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-100">Total Fitrana Amount</h3>
              <div className="text-5xl font-black tracking-tight drop-shadow-md py-2">
                {formatCurrency(totalFitrana)}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full mt-2 border border-white/10">
                <Users className="w-3.5 h-3.5" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  For {fitranaData.familyMembers.length} person(s)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Button
              onClick={markAsPaid}
              className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 font-bold tracking-wide active:scale-95 transition-all text-[13px] sm:text-sm"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Mark as Paid
            </Button>
            <Button
              variant="outline"
              onClick={shareCalculation}
              className="h-14 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-700 font-bold tracking-wide hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm active:scale-95 transition-all text-[13px] sm:text-sm"
            >
              <Share2 className="w-5 h-5 mr-2 text-slate-500" />
              Share Details
            </Button>
          </div>

          {/* Premium FAQ Section */}
          <div className="relative overflow-hidden rounded-[24px] p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-900/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                <Info className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Frequently Asked Questions</h3>
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="q1" className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-white/50 dark:bg-black/20 shadow-sm">
                <AccordionTrigger className="font-bold text-sm hover:no-underline py-4">Who is obligated to pay Fitrana?</AccordionTrigger>
                <AccordionContent className="text-sm font-medium text-slate-600 dark:text-slate-400 pb-4 leading-relaxed">
                  Every Muslim who possesses wealth above the Nisab threshold is obligated to pay Fitrana. 
                  This includes adults who have enough food for their family for one day and night. 
                  Parents should pay on behalf of their minor children.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="q2" className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-white/50 dark:bg-black/20 shadow-sm">
                <AccordionTrigger className="font-bold text-sm hover:no-underline py-4">How much is Fitrana per person?</AccordionTrigger>
                <AccordionContent className="text-sm font-medium text-slate-600 dark:text-slate-400 pb-4 leading-relaxed">
                  The standard amount is 2.5kg of wheat, barley, dates, or equivalent value. 
                  In monetary terms, it's the value of 2.5kg of staple food in your local area. 
                  Some scholars suggest 3kg for those who can afford it.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="q3" className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-white/50 dark:bg-black/20 shadow-sm">
                <AccordionTrigger className="font-bold text-sm hover:no-underline py-4">What if I can't afford it?</AccordionTrigger>
                <AccordionContent className="text-sm font-medium text-slate-600 dark:text-slate-400 pb-4 leading-relaxed">
                  If someone cannot afford the standard amount, they should pay what they can afford. 
                  The obligation is lifted for those in genuine financial hardship. 
                  Allah does not burden a soul beyond its capacity.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="q4" className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-white/50 dark:bg-black/20 shadow-sm">
                <AccordionTrigger className="font-bold text-sm hover:no-underline py-4">When should it be paid?</AccordionTrigger>
                <AccordionContent className="text-sm font-medium text-slate-600 dark:text-slate-400 pb-4 leading-relaxed">
                  Fitrana must be paid before Eid prayer begins. 
                  It's recommended to pay 1-2 days before Eid to ensure it reaches the needy in time.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Payment History */}
          {fitranaData.paymentHistory.length > 0 && (
            <div className="relative overflow-hidden rounded-[24px] p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                  <History className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Payment History</h3>
              </div>
              
              <div className="space-y-3">
                {fitranaData.paymentHistory.slice(-3).reverse().map(record => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-900 dark:text-white">{record.year}</span>
                        <div className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                          record.paid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.paid ? 'Paid' : 'Pending'}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {record.familyMembers} members
                      </p>
                    </div>
                    <div className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                       {formatCurrency(record.totalAmount)}
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={exportHistory}
                  className="w-full h-12 mt-2 rounded-xl border-slate-200 dark:border-slate-700 font-bold bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                  Export Full History
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
