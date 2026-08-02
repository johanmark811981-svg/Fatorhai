const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const newFunc = `
  const handleUpdateCategory = (categoryId: string, updates: Partial<Category>) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, ...updates } : c)),
    }));
    setRecentNotification('تم تحديث الفئة بنجاح');
  };
`;

content = content.replace('  // Handler: Save Invoice', newFunc + '\n  // Handler: Save Invoice');

// Also update ReportsView to receive this prop:
content = content.replace(
  /onExportBackup=\{\(\) => exportBackupJSON\(data\)\}/g,
  "onExportBackup={() => exportBackupJSON(data)}\n            onUpdateCategory={handleUpdateCategory}"
);

fs.writeFileSync('src/App.tsx', content);
