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
  isSubmitting,
}: ConfirmationModalProps) {
  const totalBakjes = products.reduce((acc, p) => acc + p.quantityBakjes, 0);
  const totalKisten = products.reduce((acc, p) => acc + p.quantityKisten, 0);
  const hasAnyInput = totalBakjes > 0 || totalKisten > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Dialog container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative border border-slate-100/90 z-10 flex flex-col"
          >
            {/* Header / Accent Top */}
            <div className="bg-[#BE123C] text-white p-6 relative">
              <div className="absolute right-4 top-4 text-rose-950 opacity-25">
                <ShieldCheck className="w-24 h-24 stroke-[1]" />
              </div>
              <p className="text-xs uppercase tracking-wider font-bold text-rose-200/90 font-mono">
                Bevestiging Vereist
              </p>
              <h3 className="text-2xl font-display font-medium mt-1">
                Kloppen deze gegevens?
              </h3>
              <p className="text-sm text-rose-100/90 mt-1">
                Controleer de ingevoerde hoeveelheden voordat ze naar de database worden verzonden.
              </p>
            </div>

            {/* General Info Metadata Summary */}
            <div className="p-6 space-y-5 flex-1">
              <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">Invoerder:</span>
                  <span className="ml-auto bg-slate-200/50 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                    {inputterName || "Onbekend"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">Invoerdatum:</span>
                  <span className="ml-auto font-mono text-slate-700 font-medium">
                    {inputDate}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">Invoertijd:</span>
                  <span className="ml-auto font-mono text-slate-700 font-medium">
                    {inputTime}
                  </span>
                </div>
              </div>

              {/* Product Quantities List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Gevulde Hoeveelheden
                </h4>
                <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                  {products.map((p) => {
                    const defaultUnit = p.dbName === "kerstomaten" ? "bekers" : "bakjes";
                    const hasInput = p.quantityBakjes > 0 || p.quantityKisten > 0;
                    return (
                      <div 
                        key={p.id} 
                        className="flex flex-col p-3.5 hover:bg-slate-55/40 transition-colors gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl shrink-0">{p.icon}</span>
                            <span className="font-display font-semibold text-[#BE123C] text-sm">
                              {p.displayName}
                            </span>
                          </div>
                          {!hasInput && (
                            <span className="text-xs text-slate-350 font-mono">
                              Geen invoer
                            </span>
                          )}
                        </div>

                        {hasInput && (
                          <div className="flex flex-wrap gap-2 justify-end pl-9">
                            {p.quantityBakjes > 0 && (
                              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-[#BE123C] border border-[#BE123C]/20 flex items-center gap-1">
                                {p.quantityBakjes} <span className="text-[10px] font-normal lowercase">{defaultUnit}</span>
                              </span>
                            )}
                            {p.quantityKisten > 0 && (
                              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-500/25 flex items-center gap-1">
                                {p.quantityKisten} <span className="text-[10px] font-normal lowercase">kisten</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary Row */}
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between px-2 text-sm text-slate-500 font-semibold">
                  <span>Totaal invoer:</span>
                  <span className="font-medium text-slate-800 font-mono">
                    {totalBakjes} beker(s)/bakje(s) & {totalKisten} kist(en)
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-3.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 cursor-pointer hover:text-slate-800 active:scale-98 transition-all duration-200 text-sm disabled:opacity-50"
                id="btn-confirm-cancel"
              >
                Aanpassen
              </button>
              
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting || !hasAnyInput}
                className="flex-[1.5] py-3 px-4 rounded-xl bg-[#BE123C] text-white font-medium hover:bg-[#9F1239] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/10 active:scale-98 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                id="btn-confirm-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Opslaan...
                  </span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    Opslaan in database
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
