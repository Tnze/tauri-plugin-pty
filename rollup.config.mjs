import typescript from 'rollup-plugin-typescript2';
import pkg from "./package.json" assert {type: "json"};

const mode = process.env.MODE;
const isProd = mode === 'prod';

export default {
    input: 'api/index.ts',
    output: [
        {
            file: pkg.module,
            format: 'es',
            sourcemap: !isProd
        }
    ],
    plugins: [
        typescript({
            useTsconfigDeclarationDir: true,
            tsconfigOverride: {
                compilerOptions: {
                    sourceMap: !isProd
                }
            }
        })
    ],
    external: [/^@tauri-apps\/api/],
};
