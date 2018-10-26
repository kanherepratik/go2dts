const { readFileSync, readdirSync, writeFileSync } = require("fs");
const mkdirp = require("mkdirp");
const { join } = require("path");
const { pascal } = require("case");

const go2dts = (srcFolders, outFile) => {
  let output = "";

  // Flags to inject string aliases
  let haveUUID = false;
  let haveTime = false;
  let haveTimestamp = false;

  srcFolders.forEach(srcFolder =>
    readdirSync(srcFolder)
      .filter(fileName => /^[a-zA-Z-_]+(?!test)(.pb)?\.go$/.test(fileName))
      .forEach(fileName => {
        const data = readFileSync(join(srcFolder, fileName), "utf-8").replace(
          /struct\{\}/g, // remove the type `struct{}` to simplify the parsing
          "struct"
        );
        let isEmpty = true;

        // Extract const
        const constRegex = /const \(([a-zA-Z\/ =,"\-\n\t\.()]*)\)/gm;
        let n;
        while ((n = constRegex.exec(data)) !== null) {
          output +=
            n[1]
              .split("\n")
              .filter(i => i.trim() !== "" && !i.startsWith("\t// "))
              .reduce((mem, line, i) => {
                const haveType = line.split(" =")[0].split(" ").length > 1;
                const type = line.split(" =")[0].split(" ")[1];
                const previousType = i > 0 ? mem[mem.length - 1].type : "";
                if (haveType && type !== previousType) {
                  mem.push({
                    type,
                    values: [line.split(`"`)[1]]
                  });
                } else {
                  try {
                    mem[mem.length - 1].values.push(line.split(`"`)[1]);
                    isEmpty = false;
                  } catch (e) {
                    // functional error if the first line `const` don't have any type
                    // we don't want to export this kind values for now
                    // (it's not an enum pattern)
                  }
                }
                return mem;
              }, [])
              .map(i => `export type ${i.type} = "${i.values.join(`" | "`)}"`)
              .join("\n\n") + "\n\n";
        }

        // Extract struct
        const structRegex = /type\ (\w*)\ struct\ {([a-zA-Z0-9=\(\) .,-`"':\n\t\[\]\*]*)}/gm;
        let m;
        while ((m = structRegex.exec(data)) !== null) {
          const name = m[1];
          const details = m[2]
            .split("\n")
            .filter(i => i.trim() !== "" && i.includes("json"))
            .map(parseParameter);

          if (details.length === 0) {
            continue;
          } else {
            isEmpty = false;
            const values = details.map(({ type }) => type).join(",");
            haveTime = haveTime || values.includes("Time");
            haveUUID = haveUUID || values.includes("UUID");
            haveTimestamp = haveTimestamp || values.includes("Timestamp");
          }

          output += `export interface ${pascal(name)} {`;
          output +=
            "\n" +
            details
              .filter(d => !d.internal)
              .map(d => `  ${d.name}${d.optional ? "?" : ""}: ${d.type}`)
              .join("\n");
          output += "\n}\n\n";
        }
      })
  );

  let outputPrepend = "// Generated by go2dts\n\n";

  if (haveTime) outputPrepend += "export type Time = string\n\n";
  if (haveTimestamp) outputPrepend += "export type Timestamp = number\n\n";
  if (haveUUID) outputPrepend += "export type UUID = string\n\n";

  output = outputPrepend + output;
  mkdirp.sync(join(outFile, "../"));
  writeFileSync(outFile, output);
};

function parseArray(i) {
  const isArray = /\[\]/.test(i);
  return i.replace(/[\[\]\*]|types\./g, "") + (isArray ? "[]" : "");
}

function parseParameter(i) {
  if (i.includes(`json:"-"`)) return { internal: true };

  try {
    const [
      ,
      t,
      name
    ] = /\t\w* *([a-zA-Z_0-9.*\[\]]+) *`[a-zA-Z:",0-9= ]*json:"(\w+)/.exec(i);
    const goToTsMap = {
      "sql.JSONStringArray": "string[]",
      "sql.JSONStringMap": "{[key: string]: string}",
      "sql.JSONMap": "any",
      "null.Time": "Time | null",
      "time.Time": "Time",
      "timestamp.Timestamp": "Timestamp",
      "uuid.UUID": "UUID",
      "null.UUID": "UUID | null",
      int: "number",
      int32: "number",
      uint32: "number",
      int64: "number",
      bool: "boolean"
    };

    const optional = /\*/.test(t) || i.includes("omitempty");
    const isMap = /map\[(\w*)\](.*)/.exec(t);

    let type = isMap
      ? `{[key: ${isMap[1]}]: ${parseArray(isMap[2])}}`
      : parseArray(t);

    if (goToTsMap[type]) type = goToTsMap[type];
    return { type, name, optional };
  } catch (e) {
    console.log(e);
    console.log(`${i} can't be parsed`);
  }
}

module.exports = go2dts;
