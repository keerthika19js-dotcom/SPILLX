import React, { useState } from 'react';
import { 
  X, FileText, Download, ShieldCheck, CheckCircle2, 
  AlertCircle, Hash, Printer, Loader2 
} from 'lucide-react';

export default function ReportModal({
  isOpen,
  onClose,
  spill,
  drift,
  suspects,
  weights,
}) {
  const [title, setTitle] = useState('MARITIME OIL SPILL FORENSIC INCIDENT REPORT');
  const [investigator, setInvestigator] = useState('Cmdr. Rajesh Sharma, Lead Maritime Investigator');
  const [agency, setAgency] = useState('Indian Coast Guard / DG Shipping (MARPOL Enforcement)');
  const [notes, setNotes] = useState('Vessel entered origin zone during estimated spill release window, exhibited clandestine speed reduction followed by 75-minute AIS blackout. Actionable for Port State Control detention.');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const topCulprit = suspects && suspects.length > 0 ? suspects[0] : null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const payload = {
        incident_title: title,
        investigator_name: investigator,
        agency: agency,
        notes: notes,
        spill_data: spill,
        drift_data: drift,
        suspects: suspects,
        scoring_weights: weights,
      };

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to generate report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SPILLX_Evidence_Report_${spill ? spill.spill_id : 'INC'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error downloading PDF report. Please check backend connection.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-command-900 border border-command-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-command-800 flex items-center justify-between bg-command-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-white tracking-wider">
                AUTOMATED FORENSIC EVIDENCE REPORT GENERATOR
              </h2>
              <p className="text-xs text-slate-400">
                MARPOL Annex I & UNCLOS Compliant Tamper-Evident Legal Dossier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-command-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-2 gap-3 bg-command-950/70 border border-command-800 p-3 rounded-xl">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">Incident Title:</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-command-900 border border-command-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">Enforcement Agency:</label>
              <input
                type="text"
                value={agency}
                onChange={e => setAgency(e.target.value)}
                className="w-full bg-command-900 border border-command-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">Lead Investigator:</label>
              <input
                type="text"
                value={investigator}
                onChange={e => setInvestigator(e.target.value)}
                className="w-full bg-command-900 border border-command-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Investigator Notes:</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-y bg-command-950 border border-command-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Incident Summary Card Preview */}
          <div className="bg-command-950 border border-command-800 rounded-xl p-4 space-y-3 font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-command-800">
              <span className="text-cyan-400 font-bold text-xs">INCIDENT SUMMARY OVERVIEW</span>
              <span className="text-slate-400 text-[10px]">{spill ? spill.spill_id : 'INC-2026'}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">SAR Sensor:</span>
                <span className="text-slate-200">{spill ? spill.sensor : 'Sentinel-1 SAR'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Slick Footprint:</span>
                <span className="text-cyan-300 font-bold">{spill ? spill.area_km2 : 0} km²</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Drift Duration:</span>
                <span className="text-orange-400 font-bold">{drift ? drift.drift_hours : 8} Hours Back</span>
              </div>
            </div>

            {/* Primary Culprit Summary Banner */}
            {topCulprit && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>PRIMARY CULPRIT: {topCulprit.vessel_name}</span>
                  </span>
                  <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                    {topCulprit.suspicion_score}% SUSPICION
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                  <div>MMSI: <b>{topCulprit.mmsi}</b></div>
                  <div>Type: <b>{topCulprit.vessel_type}</b></div>
                  <div>CPA: <b>{topCulprit.min_distance_to_origin_km} km</b></div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1">
                  <b>Key Evidence:</b> {topCulprit.behavior_notes ? topCulprit.behavior_notes[0] : 'Transit match'}
                </div>
              </div>
            )}
          </div>

          {/* Cryptographic Tamper-Evidence Seal Preview */}
          <div className="bg-command-950/80 border border-command-800 rounded-xl p-3 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex-1">
              <div className="text-slate-200 font-bold">DIGITAL FORENSIC SEAL ENABLED</div>
              <div>Generates a SHA-256 cryptographic verification checksum embedded into the PDF structure, ensuring unalterable chain-of-custody validity for maritime court proceedings.</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-command-800 flex items-center justify-between bg-command-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-command-800 hover:bg-command-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-950/50 transition active:scale-95 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Legal PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Official Forensic PDF Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
