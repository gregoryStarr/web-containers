export function CILogo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className="ci-logo"
    >
      <style>{`
        .ci-logo .ring {
          stroke: #1c1917;
          transition: stroke 0.3s ease;
        }
        .ci-logo:hover .ring {
          stroke: #FF6B00;
        }

        .ci-logo .line {
          stroke: #1c1917;
          stroke-dasharray: 60;
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 0.4s ease, stroke 0.3s ease;
        }
        .ci-logo:hover .line {
          stroke: #FF6B00;
          stroke-dashoffset: -60;
          animation: flow 1.2s ease infinite;
        }

        .ci-logo .node {
          fill: #1c1917;
          transition: fill 0.3s ease, r 0.3s ease;
        }
        .ci-logo:hover .node {
          fill: #FF6B00;
          animation: nodePulse 1.2s ease infinite;
        }
        .ci-logo:hover .node-2 { animation-delay: 0.2s; }
        .ci-logo:hover .node-3 { animation-delay: 0.4s; }

        .ci-logo .check {
          stroke: #1c1917;
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
          transition: stroke 0.3s ease, stroke-dashoffset 0.5s ease 0.3s;
        }
        .ci-logo:hover .check {
          stroke: #FF6B00;
          stroke-dashoffset: -100;
        }

        @keyframes flow {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        @keyframes nodePulse {
          0%, 100% { r: 10; }
          50%       { r: 13; }
        }
      `}</style>

      {/* Outer ring */}
      <circle
        cx="128"
        cy="128"
        r="96"
        className="ring"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Pipeline lines */}
      <line
        className="line"
        x1="98"
        y1="128"
        x2="118"
        y2="98"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        className="line"
        x1="138"
        y1="98"
        x2="158"
        y2="128"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Nodes */}
      <circle className="node node-1" cx="88" cy="128" r="10" />
      <circle className="node node-2" cx="128" cy="88" r="10" />
      <circle className="node node-3" cx="168" cy="128" r="10" />

      {/* Success check */}
      <path
        className="check"
        d="M108 134 L124 150 L154 110"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
