import { motion, AnimatePresence } from "motion/react";
import { Check, X, ShieldCheck, User, Calendar, Clock, ArrowRight } from "lucide-react";
import { ProductInput } from "../types";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  inputterName: string;
  inputDate: string;
  inputTime: string;
  products: ProductInput[];
  selectedVarietyGroot: string;
  selectedVarietyKlein: string;
  isSubmitting: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  inputterName,
  inputDate,
  inputTime,
  products,
  selectedVarietyGroot,
  selectedVarietyKlein,
  isSubmitting,
}: ConfirmationModalProps) {
  const totalBakjes = products.reduce((acc, p) => acc + p.quantityBakjes, 0);
  const totalPlateaus = products.reduce((acc, p) => acc + p.quantityKisten, 0);
  const filledProducts = products.filter(p => p.quantityBakjes > 0 || p.quantityKisten > 0);
  const hasAnyInput = filledProducts.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Glass background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Dialog container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-slate-100 z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header / Accent Top */}
            <div className="bg-[#BE123C] text-white px-4.5 py-3.5 relative shrink-0">
              <div className="absolute right-3 top-2.5 text-rose-950 opacity-15">
                <ShieldCheck className="w-16 h-16 stroke-[1]" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-rose-200/90 font-mono">
                Bevestiging
              </p>
              <h3 className="text-base sm:text-lg font-bold mt-0.5">
                Kloppen deze gegevens?
              </h3>
            </div>

            {/* General Info Metadata Summary */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs text-slate-650 font-mono">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-800">{inputterName || "Onbekend"}</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{inputDate} ({inputTime})</span>
                </div>
              </div>

              {/* Product Quantities List */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Gevulde Producten
                </h4>
                
                {!hasAnyInput ? (
                  <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                    Geen invoergegevens ingevoerd
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                    {filledProducts.map((p) => {
                      const defaultUnit = p.option2Label;
                      const isStrawberry = p.dbName.toLowerCase().startsWith("aardbeien");
                      const variety = p.dbName.toLowerCase().includes("groot") ? selectedVarietyGroot : selectedVarietyKlein;

                      return (
                        <div 
                          key={p.id} 
                          className="flex flex-col p-2.5 hover:bg-slate-50/60 transition-colors gap-1"
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{p.icon}</span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-800 text-xs truncate">
                                  {p.displayName}
                                </span>
                                {isStrawberry && (
                                  <span className="text-[9px] text-[#BE123C] font-semibold">
                                    Ras: <span className="bg-rose-50 border border-rose-100 px-1 py-0.2 rounded font-mono">{variety}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantities Badges */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {p.quantityBakjes > 0 && (
                                <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-[#BE123C] border border-[#BE123C]/20 flex items-center gap-0.5">
                                  {p.quantityBakjes}<span className="text-[8px] font-normal font-sans lowercase">{defaultUnit}</span>
                                </span>
                              )}
                              {p.option1Label && p.quantityKisten > 0 && (
                                <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-500/25 flex items-center gap-0.5">
                                  {p.quantityKisten}<span className="text-[8px] font-normal font-sans lowercase">{p.option1Label}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {p.comment && (
                            <div className="text-[9px] bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-slate-500 italic mt-0.5">
                              "{p.comment}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Summary Row */}
              {hasAnyInput && (
                <div className="pt-2 px-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Totale invoer:</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">
                    {totalBakjes} {totalBakjes === 1 ? "bakje" : "bakjes"}{totalPlateaus > 0 ? ` & ${totalPlateaus} ${totalPlateaus === 1 ? "plateau" : "plateaus"}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 cursor-pointer text-xs active:scale-97 transition-all duration-150"
                id="btn-confirm-cancel"
              >
                Aanpassen
              </button>
              
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting || !hasAnyInput}
                className="flex-[1.4] py-2 px-3 rounded-lg bg-[#BE123C] text-white font-semibold hover:bg-[#9F1239] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-97 transition-all duration-150 text-xs disabled:opacity-40"
                id="btn-confirm-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Opslaan...
                  </span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Opslaan
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
