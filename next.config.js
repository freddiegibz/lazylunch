/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ensure no Tailwind CSS processing
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.sideEffects === false) {
            oneOfRule.sideEffects = true;
          }
        });
      }
    });
    return config;
  },
}

module.exports = nextConfig 