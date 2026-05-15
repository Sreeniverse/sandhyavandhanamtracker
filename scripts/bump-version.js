import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const bump = process.argv[2] || 'patch'

function nextVersion(current, type) {
  const parts = current.split('.').map(Number)
  if (type === 'major') {
    parts[0]++
    parts[1] = 0
    parts[2] = 0
  } else if (type === 'minor') {
    parts[1]++
    parts[2] = 0
  } else {
    parts[2]++
  }
  return parts.join('.')
}

// Bump package.json
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const oldVer = pkg.version
const newVer = nextVersion(oldVer, bump)
pkg.version = newVer
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(`package.json: ${oldVer} -> ${newVer}`)

// Bump android/app/build.gradle
const gradlePath = resolve(root, 'android', 'app', 'build.gradle')
let gradle = readFileSync(gradlePath, 'utf8')

const vcMatch = gradle.match(/versionCode (\d+)/)
const vnMatch = gradle.match(/versionName "([^"]+)"/)

if (vcMatch && vnMatch) {
  const oldCode = parseInt(vcMatch[1])
  const newCode = oldCode + 1
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${newCode}`)
  gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${newVer}"`)
  writeFileSync(gradlePath, gradle)
  console.log(`android/app/build.gradle: versionCode ${oldCode} -> ${newCode}, versionName ${vnMatch[1]} -> ${newVer}`)
} else {
  console.error('Could not find versionCode/versionName in build.gradle')
  process.exit(1)
}

console.log(`\nBumped ${bump} version: ${oldVer} -> ${newVer}`)
