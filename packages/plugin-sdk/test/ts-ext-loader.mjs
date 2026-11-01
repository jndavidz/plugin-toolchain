// 测试专用 loader：为 extensionless 相对 import 追加 .ts 解析。
// SDK 源码按 tsup/bundler 风格写 `./cookie`（tsconfig moduleResolution=bundler），
// node --test 的原生 TS type stripping 不做 bundler 解析，这里补齐，避免为跑测试安装依赖。
export async function resolve(specifier, context, next) {
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.ts') &&
    !specifier.endsWith('.js') &&
    !specifier.endsWith('.mjs') &&
    !specifier.endsWith('.cjs') &&
    !specifier.endsWith('.json')
  ) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // 非 .ts 文件（如 .d.ts 类型源）按原样再试
    }
  }
  return next(specifier, context);
}
