import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import pkg from './package.json'

const indexEntry = new URL('./src/index.ts', import.meta.url)
const tsconfigBuild = new URL('./tsconfig.build.json', import.meta.url)
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]
const externalRegexes = externalPackages.map(
  (packageName) => new RegExp(`^${packageName.replace('/', '\\/')}(/.*)?$`),
)
const external = (id: string) => externalRegexes.some((pattern) => pattern.test(id))

const injectLibraryCss = () => ({
  name: 'inject-library-css',
  closeBundle: async () => {
    const esEntryPath = resolve(rootDir, 'dist/index.js')
    const cjsEntryPath = resolve(rootDir, 'dist/index.cjs')

    const injectLine = async (filePath: string, line: string) => {
      const fileContent = await readFile(filePath, 'utf8')

      if (fileContent.startsWith(line)) {
        return
      }

      await writeFile(filePath, `${line}${fileContent}`, 'utf8')
    }

    await injectLine(esEntryPath, 'import "./styles.css";\n')
    await injectLine(cjsEntryPath, 'require("./styles.css");\n')
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    injectLibraryCss(),
    dts({
      tsconfigPath: fileURLToPath(tsconfigBuild),
      insertTypesEntry: true,
      include: ['src'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    open: false,
    cors: true,
  },
  build: {
    lib: {
      entry: fileURLToPath(indexEntry),
      name: 'NexusChatUI',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      cssFileName: 'styles',
    },
    rollupOptions: {
      external,
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
