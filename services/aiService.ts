import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SimulationState, HealthStatus, FAULT_DESCRIPTIONS, PredictiveMaintenanceResult, PredictiveAnalysisPayload } from '../types';
import { SIMULATION_TICK_RATE_MS, MAX_TEMP } from '../constants';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        overallSummary: {
            type: Type.STRING,
            description: 'A high-level, one or two-sentence summary of the entire operational run, stating if it was nominal, stressful, or indicative of specific wear patterns.'
        },
        predictions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                componentName: {
                  type: Type.STRING,
                  description: 'The name of the component being analyzed (e.g., "HP Fuel Pump", "Fuel Filter").',
                },
                prediction: {
                  type: Type.STRING,
                  description: 'A brief, specific prediction of the component\'s future state (e.g., "Accelerated seal wear", "Progressive clogging leading to pressure drop").',
                },
                confidence: {
                    type: Type.NUMBER,
                    description: 'The model\'s confidence in this prediction, from 0.0 to 1.0.',
                },
                recommendation: {
                  type: Type.STRING,
                  description: 'A clear, actionable maintenance recommendation (e.g., "Inspect seals at next 50-hour interval", "Schedule filter replacement within next 10 operating hours").',
                },
                estimatedTimeToFailureHours: {
                  type: Type.NUMBER,
                  description: 'An optional estimated time to failure in operating hours from now. Only include if confidence is high (>0.75).',
                },
              },
              required: ['componentName', 'prediction', 'confidence', 'recommendation'],
            },
        }
    },
    required: ['overallSummary', 'predictions']
};

function buildPrompt(state: SimulationState): string {
    const operatingHours = (state.tick * SIMULATION_TICK_RATE_MS) / (1000 * 3600);
    const stressedComponents = state.components.filter(c => c.status === HealthStatus.WARN || c.status === HealthStatus.FAULT);
    const runHistory = state.history;

    // Calculate advanced metrics from the entire history of the run
    let mechanicalStressCycles = 0;
    let thermalStressEvents = 0;
    if (runHistory.length > 1) {
        for (let i = 1; i < runHistory.length; i++) {
            // Count significant throttle changes
            if (Math.abs(runHistory[i].throttle - runHistory[i-1].throttle) > 20) {
                mechanicalStressCycles++;
            }
        }
        // Count times temperature exceeded 95% of max
        thermalStressEvents = runHistory.filter(p => p.exhaustTemp > MAX_TEMP * 0.95).length;
    }

    let trendSummary = 'Nominal.';
    if (runHistory.length > 10) {
        const avgEfficiency = runHistory.reduce((acc, p) => acc + p.efficiency, 0) / runHistory.length;
        const finalEfficiency = runHistory[runHistory.length - 1].efficiency;
        if (finalEfficiency < avgEfficiency * 0.9) {
            trendSummary = `Efficiency degradation detected over the run.`;
        }
        
        const avgAfr = runHistory.reduce((acc, p) => acc + p.afr, 0) / runHistory.length;
        const afrStdDev = Math.sqrt(runHistory.map(p => Math.pow(p.afr - avgAfr, 2)).reduce((a, b) => a + b) / runHistory.length);
        if (afrStdDev > 0.8) {
            trendSummary += ` Significant Air-Fuel Ratio instability observed.`;
        }
    }

    return `
You are a Prognostic Reasoning Module for a helicopter engine's digital twin. You are performing a post-run analysis based on the complete operational history since the last system reset. Your task is to synthesize this information to provide realistic, actionable predictive maintenance advice.

**Post-Run Analysis Input:**

1.  **LSTM Trend Analysis (Emulated from full run history):**
    *   **Performance Trend:** ${trendSummary}
    *   **Mechanical Stress Cycles (High d-Throttle):** ${mechanicalStressCycles} cycles over the entire run.
    *   **Thermal Stress Events (EGT > ${ (MAX_TEMP * 0.95).toFixed(0)}K):** ${thermalStressEvents} events over the entire run.

2.  **Final System State (at pause):**
    *   **Total Operating Time:** ${operatingHours.toFixed(2)} hours
    *   **Active Fault:** ${state.activeFault} (${FAULT_DESCRIPTIONS[state.activeFault]})
    *   **Engine Speed (N1):** ${state.n1Rpm.toFixed(0)} RPM
    *   **Exhaust Gas Temp (EGT):** ${state.exhaustTemp.toFixed(0)} K
    *   **HP Fuel Pressure:** ${state.pressureHP.toFixed(2)} MPa
    *   **Components with Active Alerts at end of run:** ${stressedComponents.length > 0 ? stressedComponents.map(c => `${c.name} (${c.status})`).join(', ') : 'None'}

**Your Task:**

Based on the full operational history and final state, generate a comprehensive analysis.
1.  First, create a high-level **overallSummary** (one or two sentences) of the entire run's health.
2.  Then, identify the 2-3 components most likely to require future maintenance. Consider the interplay between factors (e.g., sustained high EGT affecting injectors). For each component, provide a specific prediction, confidence, and recommendation.

Return your complete analysis as a single JSON object matching the provided schema. Be concise and professional.
`;
}


export const getPredictiveMaintenanceAnalysis = async (state: SimulationState): Promise<PredictiveAnalysisPayload> => {
    const prompt = buildPrompt(state);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("Received an empty response from the AI model.");
    }

    try {
        const parsedJson = JSON.parse(jsonText);
        if (!parsedJson.overallSummary || !Array.isArray(parsedJson.predictions)) {
            throw new Error("AI response is missing required fields ('overallSummary', 'predictions').");
        }
        return {
            summary: parsedJson.overallSummary,
            results: parsedJson.predictions as PredictiveMaintenanceResult[],
        };
    } catch (e) {
        console.error("Failed to parse AI response JSON:", jsonText, e);
        throw new Error("Could not interpret the analysis from the AI model.");
    }
};