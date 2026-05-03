// ============================================================
// RAGHAV KOHLI — CONTENT FILE
// Edit this file to update your website. No design code needed.
// ============================================================

const CONTENT = {

  // ── PERSONAL ──────────────────────────────────────────────
  name: "Raghav Kohli",
  title: "Urban Designer · Climate Strategist",
  location: "Bengaluru, India",
  email: "raghav.kohli.work@gmail.com",
  linkedin: "linkedin.com/in/raghavkohli31",

  // ── HERO ──────────────────────────────────────────────────
  hero: {
    headline: ["Cities", "Community", "Climate"],
    statement: "I went to the ground first — five months in Mumbai's fishing villages before I drew a single line.",
  },

  // ── PROJECTS ──────────────────────────────────────────────
  // Each project has sub-projects. Add as many sub-projects as you want.
  // Sub-project minimum: title + description + images array
  // Images: put files in /images/[project-id]/[subproject-id]/ and reference them here
  // Videos: YouTube or Vimeo embed URL, e.g. "https://www.youtube.com/embed/VIDEOID"

  projects: [

    // ── ICLEI ───────────────────────────────────────────────
    {
      id: "iclei",
      title: "ICLEI",
      subtitle: "Local Governments for Sustainability",
      role: "Project Officer, Climate & Energy",
      year: "2024",
      category: "climate",
      featured: true,
      description: "Led climate strategy and policy work across South and Southeast Asia.",
      subprojects: [
        {
          id: "malaysia",
          title: "Malaysia Green City Action Plan",
          description: "City-level climate strategy spanning 5 municipalities, coordinated with national government counterparts.",
          images: [
            // "images/iclei/malaysia/cover.jpg",
            // "images/iclei/malaysia/map.jpg",
          ],
          video: "", // "https://www.youtube.com/embed/VIDEOID"
        },
        {
          id: "capacities",
          title: "CapaCities",
          description: "Capacity building programme for local government officials across South Asian cities.",
          images: [
            // "images/iclei/capacities/workshop.jpg",
          ],
          video: "",
        },
        {
          id: "loss-damage",
          title: "Loss & Damage",
          description: "Multilateral policy briefs on Loss & Damage for international climate negotiations. Presented findings to High Level Committee.",
          images: [
            // "images/iclei/loss-damage/brief.jpg",
          ],
          video: "",
        },
        {
          id: "urban95",
          title: "Udaipur Urban95",
          description: "Child-Friendly Cities assessment integrating child-sensitive spatial design into the municipal planning framework.",
          images: [
            // "images/iclei/urban95/cover.jpg",
          ],
          video: "",
        },
        {
          id: "clean-energy",
          title: "US–South Asia Mayoral Platform",
          description: "Clean Energy platform facilitating dialogue between city leaders across two continents.",
          images: [
            // "images/iclei/clean-energy/event.jpg",
          ],
          video: "",
        },
      ],
    },

    // ── NIUA ────────────────────────────────────────────────
    {
      id: "niua",
      title: "NIUA",
      subtitle: "National Institute of Urban Affairs, MoHUA India",
      role: "Climate Fellow, Climate Center for Cities",
      year: "2023",
      category: "climate",
      featured: true,
      description: "Climate policy research and toolkit development for Indian cities.",
      subprojects: [
        {
          id: "state-of-cities",
          title: "State of Cities",
          description: "Towards Low Carbon and Resilient Pathways — national policy report covering 15+ Indian cities, published by the Ministry of Housing and Urban Affairs.",
          images: [
            // "images/niua/state-of-cities/cover.jpg",
            // "images/niua/state-of-cities/spread.jpg",
          ],
          video: "",
        },
        {
          id: "compendium",
          title: "Compendium of Good Climate Practices",
          description: "Researched and documented climate interventions across 15+ municipalities for national policy adoption.",
          images: [
            // "images/niua/compendium/cover.jpg",
          ],
          video: "",
        },
        {
          id: "nbs-toolkit",
          title: "Nature-based Solutions Toolkit",
          description: "Practical NbS implementation guidance developed for urban local bodies across India.",
          images: [
            // "images/niua/nbs/cover.jpg",
            // "images/niua/nbs/pages.jpg",
          ],
          video: "",
        },
      ],
    },

    // ── PERSPECTIVES ─────────────────────────────────────────
    {
      id: "perspectives",
      title: "Perspectives",
      subtitle: "Community Platform",
      role: "Co-founder",
      year: "2025 – Present",
      category: "community",
      featured: true,
      description: "8 to 1,000+ members through word of mouth. A community built around structured human conversation.",

      // ── SCALE STATS (shown in hero moment) ──
      stats: [
        { number: "200+", label: "Conversations hosted" },
        { number: "1K+",  label: "Members, zero paid acquisition" },
        { number: "3",    label: "Formats — Spheres, Circles, Home" },
      ],

      // ── CONVERSATIONS ARCHIVE ──
      // Add each conversation here. Filters are built automatically from the data.
      // format options: "Sphere" / "Circle" / "Home" / "Special"
      // recording: YouTube or Vimeo embed URL, leave "" if none
      // photo: path to image, leave "" if none
      conversations: [

        // ── EXAMPLE ENTRIES — replace with real data ──
        {
          id: "conv-001",
          title: "What does it mean to belong to a city?",
          description: "A conversation about urban identity, belonging, and what makes a city feel like home.",
          initiator: "Raghav Kohli",
          date: "2025-03",
          format: "Sphere",
          photo: "", // "images/perspectives/conv-001.jpg"
          recording: "", // "https://www.youtube.com/embed/VIDEOID"
        },
        {
          id: "conv-002",
          title: "On grief and growth",
          description: "An intimate Sphere exploring how loss shapes identity and the relationships we build after.",
          initiator: "Shreshtha",
          date: "2025-04",
          format: "Sphere",
          photo: "",
          recording: "",
        },
        {
          id: "conv-003",
          title: "Climate anxiety and what we do with it",
          description: "How do people working in climate actually feel about the future? An honest conversation.",
          initiator: "Raghav Kohli",
          date: "2025-05",
          format: "Circle",
          photo: "",
          recording: "",
        },
        {
          id: "conv-004",
          title: "Career pivots and the identity that follows",
          description: "When you change what you do, who do you become? Hosted across three living rooms.",
          initiator: "Avani",
          date: "2025-06",
          format: "Home",
          photo: "",
          recording: "",
        },

        // Add more conversations here following the same pattern...
        // {
        //   id: "conv-005",
        //   title: "Conversation title",
        //   description: "What this conversation was about.",
        //   initiator: "Initiator name",
        //   date: "2025-07",   // YYYY-MM format
        //   format: "Sphere",
        //   photo: "images/perspectives/conv-005.jpg",
        //   recording: "",
        // },

      ],

      // Kept for compatibility — not used in Perspectives view
      subprojects: [],
    },

    // ── CEPT ────────────────────────────────────────────────
    {
      id: "cept",
      title: "CEPT University",
      subtitle: "Centre for Environmental Planning & Technology",
      role: "Bachelor of Urban Design",
      year: "2017 – 2022",
      category: "design",
      featured: true,
      description: "Five years of urban design education, research, and fieldwork.",
      subprojects: [
        // Add your 10-15 studios here as you go
        // {
        //   id: "living-heritage",
        //   title: "Living Heritage",
        //   description: "Co-designing to Revive Historical Identity. Winner, CEPT Student Excellence Award.",
        //   images: [
        //     "images/cept/living-heritage/cover.jpg",
        //     "images/cept/living-heritage/drawings.jpg",
        //   ],
        //   video: "",
        // },
        // {
        //   id: "reverse-effekt",
        //   title: "Reverse Effekt",
        //   description: "Five-month ethnographic study across 12 Koliwada fishing villages in Mumbai.",
        //   images: [
        //     "images/cept/reverse-effekt/fieldwork.jpg",
        //   ],
        //   video: "",
        // },
      ],
    },

  ],

};
