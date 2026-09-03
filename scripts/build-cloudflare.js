const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const raiz = path.resolve(__dirname, "..");
const diretorioSaida = path.join(raiz, "dist");
const paginas = ["index.html", "login.html", "cadastro.html", "recuperar-senha.html", "redefinir-senha.html"];

execFileSync(process.execPath, [path.join(__dirname, "gerar-config.js")], { stdio: "inherit" });

fs.rmSync(diretorioSaida, { recursive: true, force: true });
fs.mkdirSync(diretorioSaida, { recursive: true });

for (const pagina of paginas) {
    fs.copyFileSync(path.join(raiz, pagina), path.join(diretorioSaida, pagina));
}

fs.cpSync(path.join(raiz, "assets"), path.join(diretorioSaida, "assets"), { recursive: true });
console.log("dist gerado para publicação no Cloudflare Pages.");
