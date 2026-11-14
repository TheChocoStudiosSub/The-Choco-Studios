import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const heroPath=fileURLToPath(new URL("./src/components/hero.html",import.meta.url));
const heroToken="<!-- TCS_HERO_COMPONENT -->";

export default defineConfig({
  plugins:[{
    name:"tcs-static-hero",
    transformIndexHtml(html){
      return html.includes(heroToken)
        ? html.replace(heroToken,readFileSync(heroPath,"utf8").trim())
        : html;
    },
    configureServer(server){server.watcher.add(heroPath);},
    handleHotUpdate({file,server}){
      if(file!==heroPath)return;
      server.ws.send({type:"full-reload"});
      return [];
    }
  }]
});