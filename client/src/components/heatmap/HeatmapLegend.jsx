function HeatmapLegend() {
  const legendItems = [
    { color: 'bg-red-500', label: 'Critical (30+ gap)', description: 'Urgent attention needed' },
    { color: 'bg-orange-500', label: 'High (20-29 gap)', description: 'Significant improvement needed' },
    { color: 'bg-yellow-500', label: 'Medium (10-19 gap)', description: 'Moderate improvement needed' },
    { color: 'bg-green-400', label: 'Low (0-9 gap)', description: 'Minor improvement needed' },
    { color: 'bg-green-500', label: 'Above Target', description: 'Exceeds expectations' },
    { color: 'bg-muted dark:bg-muted', label: 'No Data', description: 'No training data available' }
  ];

  return (
    <div className="bg-white dark:bg-card rounded-lg border border-border dark:border-border p-4">
      <h3 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
        Score Legend
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded ${item.color}`}></div>
            <div>
              <p className="text-xs font-medium text-foreground dark:text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeatmapLegend;
