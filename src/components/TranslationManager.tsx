import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { translations } from '@/lib/translations';
import { exportTranslationsToJSON, importTranslationsFromJSON, getMissingTranslations, generateTranslationTemplate } from '@/utils/translation-helper';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'ur', name: 'اردو' },
  { code: 'id', name: 'Bahasa' },
  { code: 'tr', name: 'Türkçe' },
] as const;

export function TranslationManager() {
  const [selectedLanguage, setSelectedLanguage] = useState<'ar' | 'ur' | 'id' | 'tr'>('ar');
  const [translationText, setTranslationText] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const handleExport = () => {
    exportTranslationsToJSON();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importTranslationsFromJSON(file)
        .then((newTranslations) => {
          console.log('Translations imported:', newTranslations);
          // Here you would update your translations file
          // For now, just log it
        })
        .catch((error) => {
          console.error('Error importing translations:', error);
        });
    }
  };

  const handleGenerateTemplate = () => {
    const template = generateTranslationTemplate();
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'translation-template.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const missingTranslations = getMissingTranslations();
  const currentTranslations = translations[selectedLanguage];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Translation Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export/Import Controls */}
          <div className="flex gap-4">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Translations
            </Button>
            <Button onClick={handleGenerateTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-translations"
              />
              <Button asChild variant="outline" className="flex items-center gap-2">
                <label htmlFor="import-translations" className="cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Import Translations
                </label>
              </Button>
            </div>
          </div>

          {/* Missing Translations Alert */}
          {Object.keys(missingTranslations).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Missing Translations:</span>
              </div>
              <div className="mt-2 text-sm text-yellow-700">
                {Object.entries(missingTranslations).map(([lang, keys]) => (
                  <div key={lang} className="mb-1">
                    <strong>{lang}:</strong> {keys.length} keys missing
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Translation Editor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <Select value={selectedLanguage} onValueChange={(value: any) => setSelectedLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.filter(lang => lang.code !== 'en').map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Translation Key</label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a key to translate" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(translations.en).map(key => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedKey && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">English (Reference)</label>
                <div
                  className="p-3 rounded border font-medium text-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  {translations.en[selectedKey]}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {languages.find(l => l.code === selectedLanguage)?.name} Translation
                </label>
                <Textarea
                  value={translationText}
                  onChange={(e) => setTranslationText(e.target.value)}
                  placeholder={`Enter ${languages.find(l => l.code === selectedLanguage)?.name} translation...`}
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={() => {
                  console.log(`Update ${selectedKey} in ${selectedLanguage}:`, translationText);
                  // Here you would update the actual translations
                }}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Update Translation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
