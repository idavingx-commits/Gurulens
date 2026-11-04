"use client";

// Predefined star positions - only on far edges to avoid content overlap
const STAR_POSITIONS = [
  { top: 12, left: 3, size: 14 },
  { top: 28, left: 96, size: 16 },
  { top: 55, left: 2, size: 13 },
  { top: 72, left: 97, size: 15 },
  { top: 88, left: 4, size: 12 },
  { top: 42, left: 98, size: 14 },
];

// 3D Education-themed floating objects for auth pages
// Objects are positioned on far edges to avoid overlapping with content
export function FloatingObjects() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ perspective: "1200px" }}
    >
      {/* Book - far top left, hidden on mobile */}
      <div
        className="absolute hidden animate-float-3d opacity-70 lg:block"
        style={{
          top: "8%",
          left: "2%",
          animationDelay: "0s",
          animationDuration: "18s",
        }}
      >
        <Book3D />
      </div>

      {/* Graduation Cap - top right corner */}
      <div
        className="absolute animate-float-3d-reverse opacity-60"
        style={{
          top: "5%",
          right: "2%",
          animationDelay: "-4s",
          animationDuration: "20s",
        }}
      >
        <GradCap3D />
      </div>

      {/* Pencil - bottom left, hidden on mobile */}
      <div
        className="absolute hidden animate-float-3d opacity-70 lg:block"
        style={{
          bottom: "8%",
          left: "2%",
          animationDelay: "-2s",
          animationDuration: "16s",
        }}
      >
        <Pencil3D />
      </div>

      {/* Lightbulb - middle right edge, hidden on mobile */}
      <div
        className="absolute hidden animate-float-3d-reverse opacity-60 xl:block"
        style={{
          top: "40%",
          right: "1%",
          animationDelay: "-6s",
          animationDuration: "22s",
        }}
      >
        <Lightbulb3D />
      </div>

      {/* Apple - bottom right corner */}
      <div
        className="absolute animate-float-3d opacity-60"
        style={{
          bottom: "5%",
          right: "2%",
          animationDelay: "-8s",
          animationDuration: "19s",
        }}
      >
        <Apple3D />
      </div>

      {/* Globe - bottom left edge, hidden on smaller screens */}
      <div
        className="absolute hidden animate-float-3d-reverse opacity-70 xl:block"
        style={{
          bottom: "35%",
          left: "1%",
          animationDelay: "-3s",
          animationDuration: "24s",
        }}
      >
        <Globe3D />
      </div>

      {/* Calculator - top left edge, hidden on smaller screens */}
      <div
        className="absolute hidden animate-float-3d opacity-60 2xl:block"
        style={{
          top: "35%",
          left: "1%",
          animationDelay: "-5s",
          animationDuration: "21s",
        }}
      >
        <Calculator3D />
      </div>

      {/* Notebook - bottom right edge, hidden on smaller screens */}
      <div
        className="absolute hidden animate-float-3d-reverse opacity-60 2xl:block"
        style={{
          bottom: "25%",
          right: "1%",
          animationDelay: "-7s",
          animationDuration: "17s",
        }}
      >
        <Notebook3D />
      </div>

      {/* Star decorations - only on larger screens and edges */}
      {STAR_POSITIONS.map((pos, i) => (
        <div
          key={i}
          className="absolute hidden animate-pulse-slow opacity-50 lg:block"
          style={{
            top: `${pos.top}%`,
            left: `${pos.left}%`,
            animationDelay: `${i * 0.5}s`,
          }}
        >
          <Star3D size={pos.size} />
        </div>
      ))}
    </div>
  );
}

// 3D Book
function Book3D() {
  return (
    <div
      className="relative"
      style={{
        width: "80px",
        height: "100px",
        transformStyle: "preserve-3d",
        transform: "rotateX(-10deg) rotateY(20deg)",
      }}
    >
      {/* Cover */}
      <div
        className="absolute rounded-lg shadow-xl"
        style={{
          width: "80px",
          height: "100px",
          background: "linear-gradient(135deg, #0094fd 0%, #6d5bff 100%)",
          transform: "translateZ(8px)",
          borderRadius: "4px 12px 12px 4px",
        }}
      >
        <div className="absolute inset-4 flex items-center justify-center rounded border-2 border-white/30">
          <span className="text-3xl">📚</span>
        </div>
      </div>
      {/* Pages */}
      <div
        className="absolute bg-gradient-to-r from-gray-100 to-white"
        style={{
          width: "75px",
          height: "95px",
          left: "2px",
          top: "2px",
          transform: "translateZ(4px)",
          borderRadius: "2px 8px 8px 2px",
        }}
      />
      {/* Back cover */}
      <div
        className="absolute rounded-lg shadow-lg"
        style={{
          width: "80px",
          height: "100px",
          background: "linear-gradient(135deg, #0070c9 0%, #5a4de6 100%)",
          transform: "translateZ(0px)",
          borderRadius: "4px 12px 12px 4px",
        }}
      />
    </div>
  );
}

// 3D Graduation Cap
function GradCap3D() {
  return (
    <div
      className="relative"
      style={{
        width: "90px",
        height: "60px",
        transformStyle: "preserve-3d",
        transform: "rotateX(20deg) rotateY(-15deg)",
      }}
    >
      {/* Top board */}
      <div
        className="absolute shadow-xl"
        style={{
          width: "90px",
          height: "90px",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          transform: "rotateX(60deg) translateY(-20px) translateZ(10px)",
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      />
      {/* Button */}
      <div
        className="absolute rounded-full"
        style={{
          width: "12px",
          height: "12px",
          background: "#ffd700",
          left: "39px",
          top: "5px",
          transform: "translateZ(15px)",
          boxShadow: "0 2px 8px rgba(255,215,0,0.5)",
        }}
      />
      {/* Tassel */}
      <div
        className="absolute origin-top"
        style={{
          width: "4px",
          height: "35px",
          background: "linear-gradient(180deg, #ffd700, #ffb700)",
          left: "43px",
          top: "14px",
          transform: "translateZ(14px) rotateZ(15deg)",
          borderRadius: "2px",
        }}
      />
      {/* Cap base */}
      <div
        className="absolute rounded-full"
        style={{
          width: "50px",
          height: "50px",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
          left: "20px",
          top: "25px",
          transform: "translateZ(0px) rotateX(70deg)",
        }}
      />
    </div>
  );
}

// 3D Pencil
function Pencil3D() {
  return (
    <div
      className="relative"
      style={{
        width: "20px",
        height: "120px",
        transformStyle: "preserve-3d",
        transform: "rotateX(10deg) rotateY(15deg) rotateZ(-30deg)",
      }}
    >
      {/* Body */}
      <div
        className="absolute rounded-sm"
        style={{
          width: "20px",
          height: "90px",
          background: "linear-gradient(90deg, #ffd93d 0%, #ffcd00 50%, #e6b800 100%)",
          top: "15px",
          transform: "translateZ(2px)",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.2)",
        }}
      />
      {/* Tip */}
      <div
        style={{
          width: "0",
          height: "0",
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "20px solid #e6b800",
          position: "absolute",
          top: "105px",
          transform: "translateZ(2px)",
        }}
      />
      <div
        style={{
          width: "0",
          height: "0",
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "10px solid #2d2d2d",
          position: "absolute",
          top: "115px",
          left: "6px",
          transform: "translateZ(2px)",
        }}
      />
      {/* Eraser band */}
      <div
        className="absolute"
        style={{
          width: "20px",
          height: "8px",
          background: "#888",
          top: "7px",
          transform: "translateZ(3px)",
        }}
      />
      {/* Eraser */}
      <div
        className="absolute rounded-t-sm"
        style={{
          width: "20px",
          height: "10px",
          background: "linear-gradient(90deg, #ff9999, #ff6b6b, #ff9999)",
          top: "0px",
          transform: "translateZ(2px)",
        }}
      />
    </div>
  );
}

// 3D Lightbulb
function Lightbulb3D() {
  return (
    <div
      className="relative"
      style={{
        width: "60px",
        height: "90px",
        transformStyle: "preserve-3d",
        transform: "rotateY(-10deg)",
      }}
    >
      {/* Bulb glow */}
      <div
        className="absolute animate-pulse-glow rounded-full"
        style={{
          width: "80px",
          height: "80px",
          background: "radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)",
          left: "-10px",
          top: "-10px",
          filter: "blur(10px)",
        }}
      />
      {/* Glass bulb */}
      <div
        className="absolute rounded-full"
        style={{
          width: "50px",
          height: "55px",
          background: "linear-gradient(135deg, rgba(255,255,200,0.9) 0%, rgba(255,230,100,0.8) 50%, rgba(255,200,50,0.9) 100%)",
          left: "5px",
          top: "0px",
          transform: "translateZ(5px)",
          boxShadow: "inset -8px -8px 20px rgba(255,215,0,0.5), 0 5px 20px rgba(255,215,0,0.3)",
        }}
      />
      {/* Filament glow */}
      <div
        className="absolute"
        style={{
          width: "20px",
          height: "25px",
          left: "20px",
          top: "15px",
          background: "radial-gradient(ellipse, rgba(255,180,0,0.8) 0%, transparent 70%)",
          transform: "translateZ(6px)",
        }}
      />
      {/* Screw base */}
      <div
        className="absolute"
        style={{
          width: "30px",
          height: "25px",
          background: "linear-gradient(90deg, #666 0%, #888 50%, #666 100%)",
          left: "15px",
          top: "52px",
          transform: "translateZ(3px)",
          borderRadius: "0 0 5px 5px",
        }}
      >
        {/* Ridges */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute w-full"
            style={{
              height: "3px",
              background: "linear-gradient(90deg, #555 0%, #777 50%, #555 100%)",
              top: `${i * 6}px`,
            }}
          />
        ))}
      </div>
      {/* Bottom contact */}
      <div
        className="absolute rounded-full"
        style={{
          width: "12px",
          height: "8px",
          background: "#444",
          left: "24px",
          top: "75px",
          transform: "translateZ(2px)",
        }}
      />
    </div>
  );
}

// 3D Apple
function Apple3D() {
  return (
    <div
      className="relative"
      style={{
        width: "55px",
        height: "60px",
        transformStyle: "preserve-3d",
        transform: "rotateY(15deg)",
      }}
    >
      {/* Apple body */}
      <div
        className="absolute rounded-full"
        style={{
          width: "50px",
          height: "50px",
          background: "radial-gradient(circle at 30% 30%, #ff6b6b 0%, #e53935 50%, #c62828 100%)",
          left: "2px",
          top: "10px",
          transform: "translateZ(5px)",
          boxShadow: "inset -5px -5px 15px rgba(0,0,0,0.3), 5px 5px 15px rgba(0,0,0,0.2)",
        }}
      />
      {/* Highlight */}
      <div
        className="absolute rounded-full"
        style={{
          width: "15px",
          height: "20px",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 70%)",
          left: "10px",
          top: "15px",
          transform: "translateZ(8px) rotateZ(-30deg)",
        }}
      />
      {/* Stem */}
      <div
        className="absolute"
        style={{
          width: "4px",
          height: "12px",
          background: "linear-gradient(90deg, #5d4037, #795548, #5d4037)",
          left: "25px",
          top: "0px",
          transform: "translateZ(6px) rotateZ(10deg)",
          borderRadius: "2px",
        }}
      />
      {/* Leaf */}
      <div
        className="absolute"
        style={{
          width: "18px",
          height: "10px",
          background: "linear-gradient(135deg, #66bb6a 0%, #43a047 100%)",
          left: "28px",
          top: "3px",
          transform: "translateZ(7px) rotateZ(30deg)",
          borderRadius: "50% 0 50% 0",
        }}
      />
    </div>
  );
}

// 3D Globe
function Globe3D() {
  return (
    <div
      className="relative"
      style={{
        width: "70px",
        height: "70px",
        transformStyle: "preserve-3d",
        transform: "rotateX(-10deg)",
      }}
    >
      {/* Globe sphere */}
      <div
        className="absolute animate-spin-slow rounded-full"
        style={{
          width: "60px",
          height: "60px",
          background: "linear-gradient(135deg, #4fc3f7 0%, #0288d1 50%, #01579b 100%)",
          left: "5px",
          top: "0px",
          transform: "translateZ(10px)",
          boxShadow: "inset -10px -10px 30px rgba(0,0,0,0.3), 5px 5px 20px rgba(0,0,0,0.2)",
        }}
      >
        {/* Continents (simplified) */}
        <div
          className="absolute rounded-full"
          style={{
            width: "25px",
            height: "15px",
            background: "#4caf50",
            left: "18px",
            top: "20px",
            borderRadius: "40%",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "15px",
            height: "20px",
            background: "#4caf50",
            left: "8px",
            top: "25px",
            borderRadius: "40%",
          }}
        />
      </div>
      {/* Stand arc */}
      <div
        className="absolute rounded-full border-4 border-gray-400"
        style={{
          width: "50px",
          height: "50px",
          left: "10px",
          top: "5px",
          transform: "translateZ(0px) rotateY(90deg)",
          borderColor: "transparent #9e9e9e transparent #9e9e9e",
        }}
      />
      {/* Base */}
      <div
        className="absolute rounded-full"
        style={{
          width: "40px",
          height: "10px",
          background: "linear-gradient(90deg, #616161, #9e9e9e, #616161)",
          left: "15px",
          top: "62px",
          transform: "rotateX(60deg)",
        }}
      />
    </div>
  );
}

// 3D Calculator
function Calculator3D() {
  return (
    <div
      className="relative"
      style={{
        width: "50px",
        height: "70px",
        transformStyle: "preserve-3d",
        transform: "rotateX(-5deg) rotateY(20deg)",
      }}
    >
      {/* Body */}
      <div
        className="absolute rounded-lg shadow-xl"
        style={{
          width: "50px",
          height: "70px",
          background: "linear-gradient(180deg, #37474f 0%, #263238 100%)",
          transform: "translateZ(4px)",
        }}
      >
        {/* Screen */}
        <div
          className="absolute rounded"
          style={{
            width: "42px",
            height: "15px",
            background: "linear-gradient(180deg, #b2dfdb 0%, #80cbc4 100%)",
            left: "4px",
            top: "5px",
          }}
        >
          <span className="absolute right-1 text-xs font-mono text-gray-700">123</span>
        </div>
        {/* Buttons */}
        <div className="absolute left-1 top-6 grid grid-cols-4 gap-0.5 p-1">
          {["C", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "=", ""].map(
            (btn, i) => (
              <div
                key={i}
                className="flex size-2.5 items-center justify-center rounded-sm text-[4px] font-bold"
                style={{
                  background:
                    i % 4 === 3 ? "#ff9800" : i < 4 ? "#78909c" : "#455a64",
                  color: "white",
                }}
              >
                {btn}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// 3D Notebook
function Notebook3D() {
  return (
    <div
      className="relative"
      style={{
        width: "60px",
        height: "80px",
        transformStyle: "preserve-3d",
        transform: "rotateX(-8deg) rotateY(-15deg)",
      }}
    >
      {/* Cover */}
      <div
        className="absolute rounded shadow-xl"
        style={{
          width: "60px",
          height: "80px",
          background: "linear-gradient(135deg, #7c4dff 0%, #651fff 100%)",
          transform: "translateZ(5px)",
          borderRadius: "2px 8px 8px 2px",
        }}
      >
        {/* Lines decoration */}
        <div className="absolute inset-2 flex flex-col justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-0.5 rounded-full bg-white/20"
              style={{ width: `${70 - i * 10}%` }}
            />
          ))}
        </div>
      </div>
      {/* Pages */}
      {[4, 3, 2, 1].map((z) => (
        <div
          key={z}
          className="absolute rounded bg-white"
          style={{
            width: "57px",
            height: "77px",
            left: "1px",
            top: "1px",
            transform: `translateZ(${z}px)`,
            borderRadius: "1px 6px 6px 1px",
            boxShadow: "inset 0 0 5px rgba(0,0,0,0.05)",
          }}
        >
          {/* Ruled lines */}
          <div className="absolute inset-2 flex flex-col gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-px bg-blue-100" />
            ))}
          </div>
        </div>
      ))}
      {/* Spiral binding */}
      <div className="absolute left-0 top-2 flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="size-2 rounded-full bg-gray-400 shadow-sm"
            style={{ transform: "translateZ(6px)" }}
          />
        ))}
      </div>
    </div>
  );
}

// Small decorative star
function Star3D({ size = 15 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #ffd700 0%, #ffb700 100%)",
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        filter: "drop-shadow(0 0 3px rgba(255,215,0,0.5))",
      }}
    />
  );
}
