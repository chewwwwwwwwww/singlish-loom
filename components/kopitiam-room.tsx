/**
 * One shared cutaway room, drawn in the same ink-and-cloth palette as the phrase art.
 * Coordinates are in the mural's 1600 × 1000 viewBox. Submitted motifs are layered
 * by KopitiamMural; this component contains architecture and furniture only.
 */
export function KopitiamRoom({ id }: { id: string }) {
  const ink = "#174e45";
  const paper = "#f8f6ed";
  const orange = "#dd6040";
  const mint = "#bdd7c4";

  return <g className="kopitiam-room-drawing" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <pattern id={`${id}-room-cloth`} width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M0 4h32M0 20h32M4 0v32M20 0v32" fill="none" stroke={ink} strokeWidth=".65" opacity=".06"/>
        <path d="m1 1 3 3m12 12 3 3m12 12 3 3" fill="none" stroke={paper} strokeWidth=".8" opacity=".48"/>
      </pattern>
      <pattern id={`${id}-counter-tile`} width="52" height="48" patternUnits="userSpaceOnUse">
        <rect width="52" height="48" fill={mint}/>
        <path d="M0 0h52v48H0Z" fill="none" stroke={paper} strokeWidth="3"/>
        <path d="m26 8 14 16-14 16-14-16Z" fill="#88afa0"/>
        <path d="m26 15 8 9-8 9-8-9Z" fill="#d9e5cc"/>
      </pattern>
      <pattern id={`${id}-awning-stripes`} width="128" height="122" patternUnits="userSpaceOnUse">
        <path d="M0 0h64v88q-32 36-64 0Z" fill={orange}/>
        <path d="M64 0h64v88q-32 36-64 0Z" fill={paper}/>
        <path d="M8 9h48v75M72 9h48v75" fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="3 5" opacity=".34"/>
      </pattern>
      <clipPath id={`${id}-floor-clip`}>
        <path d="M65 508h1470l65 300H0Z"/>
      </clipPath>
      <clipPath id={`${id}-window-clip`}>
        <path d="M1142 203h347v215h-347Z"/>
      </clipPath>
    </defs>

    {/* All four phrase areas share this wall, floor, light and perspective. */}
    <path d="M0 102h1600v898H0Z" fill="#e9e8d5"/>
    <path d="M67 107h1466v430H67Z" fill="#f0eee0"/>
    <path d="M0 111 67 143v394L0 810Z" fill="#8fbaa9"/>
    <path d="m1533 143 67-32v699l-67-273Z" fill="#c8d8be"/>
    <path d="M65 508h1470l65 300H0Z" fill="#c1d0bb"/>
    <g clipPath={`url(#${id}-floor-clip)`}>
      <path d="M-160 576h1920v39H-160ZM-160 663h1920v65H-160Z" fill="#adbfaa"/>
      <path d="M450 508 253 808H39l354-300ZM653 508l-80 300H430l176-300ZM853 508l55 300H760l43-300ZM1057 508l193 300h-168l-77-300ZM1265 508l369 300h-217l-204-300Z" fill="#d5dfc9"/>
      <g fill="none" stroke={paper} strokeWidth="3" opacity=".83">
        <path d="M0 548h1600M0 595h1600M0 660h1600M0 742h1600"/>
        <path d="m64 510-378 300m217-300-315 300m222-300-253 300m226-300-186 300m227-300-117 300m226-300-47 300m226-300 25 300m226-300 100 300m226-300 172 300m226-300 245 300m226-300 318 300m226-300 390 300"/>
      </g>
      <path d="M1135 418 1427 418 1237 808H672Z" fill={paper} opacity=".14"/>
    </g>
    <path d="M72 511h1457M67 522h1466" stroke={ink} strokeWidth="4" opacity=".42"/>
    <path d="M65 129v375m1470-375v375" stroke={ink} strokeWidth="4" opacity=".4"/>

    {/* Shared shop facade and awning; deliberately no framed phrase bays. */}
    <path d="M20 103h38v704H20Zm1522 0h38v704h-38Z" fill={paper} stroke={ink} strokeWidth="4"/>
    <path d="M32 146v611m1522-611v611" stroke="#b2c3ae" strokeWidth="5"/>
    <path d="M11 789h62v20H11Zm1516 0h73v20h-73Z" fill={ink}/>
    <path d="M0 12h1600v16H0Z" fill={ink}/>
    <g transform="translate(0 25)"><rect width="1600" height="117" fill={`url(#${id}-awning-stripes)`}/></g>
    <path d="M0 27h1600" stroke={ink} strokeWidth="4"/>
    <path d="M21 132h1558v15H21Z" fill={ink} opacity=".13"/>

    {/* A single shop plaque, two pendants and a fan make the room recognizable. */}
    <path d="M145 160h430v87H145Z" fill={ink}/>
    <path d="M153 167h414v72H153Z" fill={paper}/>
    <path d="M162 177h396v53H162Z" fill="none" stroke={orange} strokeWidth="1.6" strokeDasharray="4 5"/>
    <text x="360" y="219" fill={ink} textAnchor="middle" fontFamily="Georgia, serif" fontSize="40" fontWeight="700" letterSpacing="-1.5">Singlish Loom</text>
    <g fill="none" stroke={ink} strokeWidth="3">
      <path d="M659 144v104M1069 144v120"/>
      <path d="M826 146v45"/>
    </g>
    <g stroke={ink} strokeWidth="3">
      <path d="M626 251q33-42 66 0v9h-66Z" fill={orange}/>
      <ellipse cx="659" cy="260" rx="34" ry="7" fill="#efca75"/>
      <path d="M1036 267q33-42 66 0v9h-66Z" fill={orange}/>
      <ellipse cx="1069" cy="276" rx="34" ry="7" fill="#efca75"/>
    </g>
    <g className="room-fan" fill={mint} stroke={ink} strokeWidth="2">
      <path d="M822 212c-69-43-115-48-118-30s48 30 114 37Z"/>
      <path d="M831 208c25-52 74-66 82-45s-19 45-78 52Z"/>
      <path d="M832 224c37 17 85 41 65 60s-48-12-72-55Z"/>
      <ellipse cx="826" cy="218" rx="17" ry="12" fill="#efca75"/>
      <ellipse cx="826" cy="218" rx="6" ry="4" fill={ink}/>
    </g>

    {/* Daylight window: outside foliage is quiet enough for contributed figures. */}
    <path d="M1128 189h375v241h-375Z" fill={ink}/>
    <g clipPath={`url(#${id}-window-clip)`}>
      <path d="M1142 203h347v215h-347Z" fill="#c9d9ec"/>
      <circle cx="1436" cy="248" r="25" fill="#efca75"/>
      <path d="M1135 359q50-47 98-2t96-6 77 2 96-12v91h-367Z" fill="#a5c2ac"/>
      <path d="M1223 420V345m94 75v-93m83 93v-60" stroke="#7ba394" strokeWidth="5"/>
      <path d="m1151 213 60 0-69 150v-82Zm122 0h62l-97 205h-62Zm126 0h61l-97 205h-62Z" fill={paper} opacity=".18"/>
    </g>
    <path d="M1249 201v218m119-218v218m-235-106h365" stroke={ink} strokeWidth="10"/>
    <path d="M1118 430h395v15h-395Z" fill="#e2c59f" stroke={ink} strokeWidth="3"/>
    <path d="M1148 208h91m20 0h97m22 0h101" stroke={paper} strokeWidth="2" opacity=".8"/>

    {/* Counter: the top is available for phrase objects, not another gallery. */}
    <ellipse cx="313" cy="589" rx="256" ry="23" fill={ink} opacity=".11"/>
    <path d="m82 397 419-5 24 169-418 0Z" fill={`url(#${id}-counter-tile)`} stroke={ink} strokeWidth="3"/>
    <path d="m501 392 28-21 24 170-28 20Z" fill="#7da795" stroke={ink} strokeWidth="3"/>
    <path d="m78 370 417-13 36 28-427 20Z" fill="#efca75" stroke={ink} strokeWidth="3"/>
    <path d="m104 405 427-20v12l-427 21Z" fill={ink}/>
    <path d="M102 552h424v19H102Z" fill={ink}/>
    <path d="m117 388 375-12" stroke={paper} strokeWidth="2" strokeDasharray="5 5" opacity=".8"/>
    <g transform="translate(122 270)" stroke={ink} strokeWidth="3">
      <path d="M7 19h62v82H7Z" fill="#c9d9ec"/>
      <path d="M15 28h46v37H15Z" fill="#aec4ce"/>
      <path d="M15 69h46v12H15Z" fill={ink}/>
      <path d="M12 16h52M24 9h30" fill="none"/>
      <path d="M68 34q35-7 29 17H69" fill="none"/>
      <path d="M27 86h27v14H27Z" fill={paper}/>
      <path d="M75 100h41v5H75Z" fill={ink}/>
      <path d="M80 76h28l-3 21q-10 8-21 0Z" fill={paper}/>
      <path d="M108 80q18-2 10 11h-10" fill="none"/>
      <circle cx="39" cy="43" r="10" fill="#efca75" strokeWidth="2"/>
      <path d="m39 43 5-4" fill="none" strokeWidth="2"/>
    </g>
    <path d="M131 472h348" stroke={paper} strokeWidth="2" opacity=".46"/>

    {/* Rear chairs tuck behind the round table; the floor anchors every object. */}
    <g fill="none" stroke={ink} strokeWidth="6">
      <path d="M647 518v-63q0-27 27-27h19q27 0 27 27v63M650 512v87m69-87v87"/>
      <path d="M1004 519v-49q0-28 29-28h19q27 0 27 28v49m-74-3v85m73-85v85"/>
    </g>
    <path d="M655 457h56v47h-56Zm359 10h55v39h-55Z" fill="#c5916b" stroke={ink} strokeWidth="3"/>
    <path d="M645 513q40-12 79 0v14h-79Zm355 2q42-12 83 0v14h-83Z" fill={orange} stroke={ink} strokeWidth="3"/>
    <ellipse cx="852" cy="764" rx="215" ry="29" fill={ink} opacity=".12"/>
    <path d="M840 620v111m26-111v111m-55 21 43-26 42 26" fill="none" stroke={ink} strokeWidth="12"/>
    <path d="M839 651h28v76h-28Z" fill="#d9d5c1"/>
    <path d="M653 602q201-77 400 0v15q-201 85-400 0Z" fill="#cfbd98" stroke={ink} strokeWidth="3"/>
    <ellipse cx="853" cy="601" rx="201" ry="66" fill="#e3eba4" stroke={ink} strokeWidth="4"/>
    <ellipse cx="853" cy="596" rx="188" ry="56" fill="none" stroke={paper} strokeWidth="3" opacity=".7"/>
    <path d="M695 587q160-53 315 0" fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="4 7" opacity=".22"/>

    {/* Front chairs keep the room open, leaving space for actual arrivals. */}
    <g stroke={ink} strokeWidth="4">
      <path d="M586 660v97m74-97v97m443-96v96m73-96v96" fill="none" strokeWidth="7"/>
      <path d="M580 653q39-14 86 0v18h-86Zm517 0q43-15 85 0v18h-85Z" fill={orange}/>
      <path d="M581 651v-47q0-20 21-20h43q21 0 21 20v47m431 0v-46q0-21 21-21h43q21 0 21 21v46" fill="none" strokeWidth="7"/>
      <path d="M592 596h61v31h-61Zm517 0h61v31h-61Z" fill="#c5916b" strokeWidth="2"/>
    </g>

    {/* A bench beneath the same window, with no invented occupants. */}
    <ellipse cx="1311" cy="691" rx="207" ry="21" fill={ink} opacity=".12"/>
    <g stroke={ink} strokeWidth="4">
      <path d="M1142 570v113m322-113v113" fill="none" strokeWidth="8"/>
      <path d="M1134 485h348v67h-348Z" fill="#ca9e71"/>
      <path d="M1142 501h331m-331 17h331m-331 17h331" fill="none" stroke="#a47f59" strokeWidth="3"/>
      <path d="m1120 562 352-8 23 30-353 15Z" fill="#efca75"/>
      <path d="M1142 599h353v14h-353Z" fill={orange}/>
      <path d="M1116 549v39m380-53v50" fill="none" strokeWidth="8"/>
    </g>

    {/* The five-foot way is part of the same scene, not a strip of cards. */}
    <path d="M0 800h1600v200H0Z" fill="#d6c39e"/>
    <path d="M0 801h1600v13H0Z" fill={ink}/>
    <path d="M0 815h1600v9H0Z" fill={paper} opacity=".65"/>
    <g stroke={paper} strokeWidth="3" opacity=".45">
      <path d="M0 885h1600M0 966h1600M192 822l-37 178m317-178-22 178m307-178-6 178m300-178 11 178m292-178 29 178"/>
    </g>
    <path d="M0 984h1600v16H0Z" fill={ink} opacity=".21"/>

    {/* Fixed street furniture leaves the center for contributed motifs. */}
    <g transform="translate(48 753)" stroke={ink} strokeWidth="3">
      <ellipse cx="52" cy="177" rx="54" ry="12" fill={ink} opacity=".13" stroke="none"/>
      <path d="M52 115V43m0 42-26-25m26 8 28-29" fill="none"/>
      <path d="M50 47Q16 5 32-4q31 13 25 47M31 65Q-8 61 0 36q33-2 37 28M53 68q22-58 43-45 0 29-40 49M51 99Q0 96 13 71q33-5 42 30" fill="#8fb5a0"/>
      <path d="M9 118h87l-16 55H25Z" fill={orange}/>
      <path d="M23 131h60" fill="none" stroke="#efca75" strokeWidth="3"/>
    </g>
    <g transform="translate(1455 685)" stroke={ink} strokeWidth="3">
      <ellipse cx="30" cy="229" rx="53" ry="12" fill={ink} opacity=".12" stroke="none"/>
      <path d="M29 165V74m0 57-22-27m22 6 27-26" fill="none"/>
      <path d="M27 83Q-2 33 17 23q28 19 18 59M10 109Q-33 85-18 66q35 9 33 44M32 111q12-64 39-47-1 35-36 52M27 145q-49-22-32-44 31 5 35 45" fill="#88ad95"/>
      <path d="M-9 163h77l-13 61H4Z" fill="#c9d9ec"/>
      <path d="M2 178h54" fill="none" stroke={paper} strokeWidth="3"/>
    </g>
    <g transform="translate(1270 847)" stroke={ink} strokeWidth="3.5" fill="none">
      <ellipse cx="117" cy="132" rx="140" ry="9" fill={ink} stroke="none" opacity=".12"/>
      <circle cx="41" cy="89" r="37" fill="#d6c39e"/>
      <circle cx="194" cy="89" r="37" fill="#d6c39e"/>
      <path d="m41 89 49-59 33 59H41l36-46 91-3 26 49M123 89l45-49-9-27h-18M86 36 81 18m-17 0h35"/>
      <circle cx="123" cy="89" r="9" fill="#efca75"/>
      <path d="m129 95 13 10h10M34 88l10 4m139-2 12 4"/>
      <path d="M153-1h60l-7 27h-40Z" fill="#efca75" strokeWidth="3"/>
      <path d="m167 4 8 18m7-18 8 18m7-18 7 18" strokeWidth="1.4"/>
    </g>
    <g transform="translate(183 817)" stroke={ink} strokeWidth="3">
      <ellipse cx="25" cy="150" rx="29" ry="6" fill={ink} stroke="none" opacity=".13"/>
      <path d="M22 48v95m-13 0h29" fill="none" strokeWidth="6"/>
      <path d="M-4 8q0-11 11-11h39q11 0 11 11v46H-4Z" fill="#87ae9f"/>
      <path d="M5 14h43v8H5Z" fill={ink} stroke="none"/>
      <path d="M5 40h27" fill="none" stroke={paper} strokeWidth="2"/>
    </g>

    {/* One quiet cloth texture across the whole room keeps its materials coherent. */}
    <path d="M0 25h1600v975H0Z" fill={`url(#${id}-room-cloth)`} pointerEvents="none"/>
  </g>;
}
