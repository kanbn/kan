const PatternedBackground = () => (
  <div className="absolute inset-0 h-full w-full">
    <svg className="h-full w-full">
      <pattern
        id="pattern"
        x="10"
        y="10"
        width="14.423223834988539"
        height="14.423223834988539"
        patternUnits="userSpaceOnUse"
        patternTransform="translate(-0.45072574484339184,-0.45072574484339184)"
      >
        <circle
          cx="0.45072574484339184"
          cy="0.45072574484339184"
          r="0.45072574484339184"
          fill="#3e3e3e"
        ></circle>
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"></rect>
    </svg>
  </div>
);

export default PatternedBackground;
