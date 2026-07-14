import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Set the working directory for the bundler to resolve paths correctly
Config.setPublicDir("public");