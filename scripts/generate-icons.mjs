import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
const src = join(iconsDir, 'icon-512.svg')

await sharp(src).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'))
console.log('✓ icon-512.png')

await sharp(src).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'))
console.log('✓ icon-192.png')

console.log('Ícones gerados com sucesso.')
