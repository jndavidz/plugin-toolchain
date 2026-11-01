// node --test 入口：注册 ts 扩展名解析 loader 后跑全部 *.test.ts。
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

register(new URL('./ts-ext-loader.mjs', import.meta.url));
