import React from "react";
import { motion } from "motion/react";
import { Plus, Minus } from "lucide-react";
import { ProductInput } from "../types";

interface ProductCardProps {
  key?: React.Key | string | number;
  product: ProductInput;
  onChangeQtyBakjes: (quantity: number) => void;
  onChangeQtyKisten: (quantity: number) => void;
}

export default function ProductCard({
  product,
  onChangeQtyBakjes,
  onChangeQtyKisten,
}: ProductCardProps) {
  const defaultUnit = product.dbName === "kerstomaten" ? "bekers" : "bakjes";

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
      <div className="flex items-center gap-3 min-w-0 w-full xs:w-auto">
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

      {/* Inputs right side: Two columns side-by-side */}
      <div className="flex items-center justify-between xs:justify-end gap-3.5 sm:gap-4 shrink-0 w-full xs:w-auto mt-2 xs:mt-0">
        
        {/* Column 1: Kisten */}
        <div className="flex flex-col items-center flex-1 xs:flex-initial">
          <span className="text-[10px] xs:text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none block text-center min-w-14">
            kisten
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

        {/* Column 2: Bakjes / Bekers */}
        <div className="flex flex-col items-center flex-1 xs:flex-initial">
          <span className="text-[10px] xs:text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none block text-center min-w-14">
            {defaultUnit}
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
    </motion.div>
  );
}
