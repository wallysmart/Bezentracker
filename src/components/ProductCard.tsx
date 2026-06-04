import React from "react";
import { motion } from "motion/react";
import { Plus, Minus, MessageSquare, X } from "lucide-react";
import { ProductInput } from "../types";

interface ProductCardProps {
  key?: React.Key | string | number;
  product: ProductInput;
  onChangeQtyBakjes: (quantity: number) => void;
  onChangeQtyKisten: (quantity: number) => void;
  onChangeComment?: (comment: string) => void;
  isStrawberry?: boolean;
  varietySelected?: string;
  availableVarieties?: string[];
  onChangeVariety?: (variety: string) => void;
}

export default function ProductCard({
  product,
  onChangeQtyBakjes,
  onChangeQtyKisten,
  onChangeComment,
  isStrawberry = false,
  varietySelected = "",
  availableVarieties = [],
  onChangeVariety,
}: ProductCardProps) {
  const [isCommentOpen, setIsCommentOpen] = React.useState(false);
  const [tempComment, setTempComment] = React.useState(product.comment || "");

  const handleOpenComment = () => {
    setTempComment(product.comment || "");
    setIsCommentOpen(true);
  };

  const handleSaveComment = () => {
    onChangeComment?.(tempComment);
    setIsCommentOpen(false);
  };

  const handleIncrementBakjes = () => {
    onChangeQtyBakjes(product.quantityBakjes + product.step);
  };

  const handleDecrementBakjes = () => {
    onChangeQtyBakjes(Math.max(0, product.quantityBakjes - product.step));
  };

  const handleManualChangeBakjes = (val: string) => {
    if (val === "") {
      onChangeQtyBakjes(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChangeQtyBakjes(Math.min(product.max, parsed));
    }
  };

  const handleIncrementKisten = () => {
    onChangeQtyKisten(product.quantityKisten + product.step);
  };

  const handleDecrementKisten = () => {
    onChangeQtyKisten(Math.max(0, product.quantityKisten - product.step));
  };

  const handleManualChangeKisten = (val: string) => {
    if (val === "") {
      onChangeQtyKisten(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChangeQtyKisten(Math.min(product.max, parsed));
    }
  };

  const hasInput = product.quantityBakjes > 0 || product.quantityKisten > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -0.5 }}
      transition={{ duration: 0.15 }}
      className={`rounded-2xl p-3.5 border transition-all duration-300 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 ${
        hasInput 
          ? "bg-white border-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" 
          : "bg-slate-50/60 border-slate-200/85 hover:border-slate-300"
      }`}
    >
      {/* Product Left Side: Name and Emoji */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full xs:w-auto">
        <div className="flex items-center gap-3">
          <span 
            className="text-2xl shrink-0 select-none p-1.5 rounded-xl transition-all duration-300 flex items-center justify-center"
            style={{ backgroundColor: hasInput ? `${product.accentColor}12` : 'rgba(241, 245, 249, 0.5)' }}
          >
            {product.icon}
          </span>
          <div className="min-w-0">
            <h4 className="font-display font-black text-sm xs:text-base text-[#BE123C] tracking-wide truncate uppercase leading-none">
              {product.displayName}
            </h4>
          </div>
        </div>

        {/* Strawberry Variety Selector Dropdown */}
        {isStrawberry && availableVarieties && availableVarieties.length > 0 && (
          <div className="flex items-center gap-1.5 sm:ml-3 bg-slate-100/50 border border-slate-200/40 rounded-xl px-2.5 py-1 shrink-0 self-start sm:self-auto shadow-5xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono shrink-0">Ras:</span>
            <select
              value={varietySelected}
              onChange={(e) => onChangeVariety?.(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer outline-none py-0.5 pr-1 pl-0 font-sans"
            >
              {availableVarieties.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Optional small Comment/Opmerking Button */}
        <div className="flex items-center sm:ml-2">
          <button
            type="button"
            onClick={handleOpenComment}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider ${
              product.comment
                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-5xs"
                : "bg-slate-100/60 border-slate-200/40 text-slate-400 hover:bg-slate-100/90 hover:text-slate-600 hover:border-slate-300"
            }`}
            title={product.comment ? `Opmerking: ${product.comment}` : "Voeg opmerking toe"}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {product.comment ? (
              <span className="text-[9px] text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded-md max-w-[80px] truncate">
                {product.comment}
              </span>
            ) : (
              <span className="text-[9px] text-slate-400 font-sans font-medium uppercase tracking-normal">Opmerking</span>
            )}
          </button>
        </div>
      </div>

      {/* Inputs right side: Dynamically rendered based on layout options */}
      <div className="flex items-center justify-between xs:justify-end gap-3.5 sm:gap-4 shrink-0 w-full xs:w-auto mt-2 xs:mt-0">
        
        {/* Column 1: Option 1 (e.g., Plateau) */}
        {product.option1Label && (
          <div className="flex flex-col items-center flex-1 xs:flex-initial">
            <span className="text-[10px] xs:text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none block text-center min-w-14">
              {product.option1Label}
            </span>
            <div className="flex items-center bg-slate-50 xs:bg-white px-1 py-1 rounded-full border border-slate-200/80 shadow-5xs w-full xs:w-auto justify-between xs:justify-start">
              <button
                type="button"
                onClick={handleDecrementKisten}
                className="w-10 h-10 rounded-full bg-white xs:bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all outline-none cursor-pointer border border-slate-100/50 xs:border-none shadow-5xs xs:shadow-none shrink-0"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={product.quantityKisten === 0 ? "" : product.quantityKisten}
                onChange={(e) => handleManualChangeKisten(e.target.value)}
                placeholder="0"
                className="w-8 text-center bg-transparent border-none text-base font-extrabold focus:outline-none select-all"
                style={{ color: product.quantityKisten > 0 ? product.accentColor : '#475569' }}
              />
              <button
                type="button"
                onClick={handleIncrementKisten}
                className="w-10 h-10 rounded-full bg-white xs:bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all outline-none cursor-pointer border border-slate-100/50 xs:border-none shadow-5xs xs:shadow-none shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* Column 2: Option 2 (e.g., Bakjes / Potje) */}
        <div className="flex flex-col items-center flex-1 xs:flex-initial">
          <span className="text-[10px] xs:text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none block text-center min-w-14">
            {product.option2Label}
          </span>
          <div className="flex items-center bg-slate-50 xs:bg-white px-1 py-1 rounded-full border border-slate-200/80 shadow-5xs w-full xs:w-auto justify-between xs:justify-start">
            <button
              type="button"
              onClick={handleDecrementBakjes}
              className="w-10 h-10 rounded-full bg-white xs:bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all outline-none cursor-pointer border border-slate-100/50 xs:border-none shadow-5xs xs:shadow-none shrink-0"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={product.quantityBakjes === 0 ? "" : product.quantityBakjes}
              onChange={(e) => handleManualChangeBakjes(e.target.value)}
              placeholder="0"
              className="w-8 text-center bg-transparent border-none text-base font-extrabold focus:outline-none select-all"
              style={{ color: product.quantityBakjes > 0 ? product.accentColor : '#475569' }}
            />
            <button
              type="button"
              onClick={handleIncrementBakjes}
              className="w-10 h-10 rounded-full bg-white xs:bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all outline-none cursor-pointer border border-slate-100/50 xs:border-none shadow-5xs xs:shadow-none shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

      </div>

      {/* Small Comment Popup Modal */}
      {isCommentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm border border-slate-100/90 overflow-hidden flex flex-col">
            <div className="bg-[#BE123C] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-200" />
                <h4 className="font-display font-bold text-sm uppercase">Opmerking toevoegen</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCommentOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{product.icon}</span>
                <p className="text-xs font-semibold text-slate-500">
                  Opmerking voor <span className="text-[#BE123C] font-black">{product.displayName}</span>:
                </p>
              </div>
              <textarea
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                placeholder="Bijv. Plateau's met extra grote maat, lichte kneuzing..."
                maxLength={200}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#BE123C]/30 focus:border-[#BE123C] font-sans text-slate-800 leading-relaxed shadow-inner"
              />
              <p className="text-[10px] text-slate-400 text-right font-mono font-medium">{tempComment.length} / 200 tekens</p>
            </div>
            <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setTempComment("");
                  onChangeComment?.("");
                  setIsCommentOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Wissen
              </button>
              <button
                type="button"
                onClick={handleSaveComment}
                className="px-4 py-2 rounded-xl bg-[#BE123C] text-white text-xs font-bold hover:bg-[#9F1239] transition-all cursor-pointer shadow-md shadow-rose-600/10"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
