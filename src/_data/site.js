module.exports = {
  name: "Raghav Kohli",
  email: "raghavkohli31@gmail.com",
  linkedin: "https://www.linkedin.com/in/raghavkohli/", // <-- confirm/replace
  github: "https://github.com/raghavk31", // "" to hide
  scholar: "",   // <-- Google Scholar URL, or "" to hide
  substack: "",  // <-- Substack URL, or "" to hide
  url: "https://raghavkohli.xyz",
  // the thoughts journal (worker/): the API's URL once deployed. Only the owner key writes, so there
  // is no bot check to configure. For a local build against `wrangler dev`:
  //   THOUGHTS_API=http://localhost:8788 npx eleventy --serve
  thoughtsApi: process.env.THOUGHTS_API !== undefined ? process.env.THOUGHTS_API : "https://thoughts.raghavkohli31.workers.dev",
};
