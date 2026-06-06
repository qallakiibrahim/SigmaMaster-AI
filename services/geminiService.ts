export const generateInsight = async (prompt: string, context?: string): Promise<string> => {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sm_token') || ''}`
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(errorMsg || 'Misslyckades att hämta AI-insikter');
    }

    const data = await res.json();
    return data.insight || 'Kunde inte hämta insikter.';
  } catch (err) {
    console.error('Error fetching insight from backend:', err);
    return 'Ett fel uppstod vid kommunikation med AI-tjänsten på servern. Kontrollera att servern är aktiv och att din API-nyckel är konfigurerad.';
  }
};

export const analyzeDataPattern = async (data: number[]): Promise<string> => {
  const dataStr = data.slice(0, 50).join(', '); // Limit data sent to context
  return generateInsight(`Analysera denna datamängd för mönster, normalitet eller avvikelser: [${dataStr}]`);
};
