module.exports = {
  name: "Raghav Kohli",
  email: "raghavkohli31@gmail.com",
  linkedin: "https://www.linkedin.com/in/raghavkohli/", // <-- confirm/replace
  github: "https://github.com/raghavk31", // "" to hide
  scholar: "",   // <-- Google Scholar URL, or "" to hide
  substack: "",  // <-- Substack URL, or "" to hide
  url: "https://raghavkohli.xyz",
  // the thoughts wall (worker/): the API's URL once deployed, and the Turnstile site key ("" = no bot check).
  // For a local build against `wrangler dev`: THOUGHTS_API=http://localhost:8788 TURNSTILE_KEY= npx eleventy --serve
  thoughtsApi: process.env.THOUGHTS_API !== undefined ? process.env.THOUGHTS_API : "https://thoughts.raghavkohli31.workers.dev",
  turnstileKey: process.env.TURNSTILE_KEY !== undefined ? process.env.TURNSTILE_KEY : "0x4AAAAAAE-12jodayntsBSg",
};
