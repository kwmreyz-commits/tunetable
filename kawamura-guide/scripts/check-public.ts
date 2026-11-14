// 公開前の安全確認。問題があれば失敗させる。
import { clinic } from "../src/data/clinic";
import { stages } from "../src/data/journey";
import { modelCases } from "../src/data/modelCases";
import { dock } from "../src/data/dock";
import { publicProblems } from "../src/lib/publicCheck";
import { builtin } from "../src/lib/settings";

const problems = publicProblems(stages, modelCases, clinic, builtin.treatments, dock.confirmed);
const hidden = modelCases.filter((c) => !c.confirmed);

if (hidden.length > 0) {
  console.log(
    `お知らせ：未確認のモデルケース ${hidden.length} 件は公開版に出ません。`,
  );
}
if (problems.length > 0) {
  console.error("公開ビルドを止めました。次を直してください：");
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("公開前チェック OK");
