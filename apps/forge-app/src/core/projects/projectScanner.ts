export type ProjectEcosystem = "node" | "java" | "rust" | "python" | "dotnet" | "go";

export interface ProjectManifest {
  name: string;
  version?: string;
  ecosystem: ProjectEcosystem;
  framework?: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "cargo" | "pip" | "poetry" | "maven" | "gradle" | "dotnet" | "go";
  scripts: Record<string, string>; // e.g. dev, build, start, test, lint
  path: string;
  gitBranch?: string;
  isGitDirty?: boolean;
  activePort?: number;
}

export function detectEcosystemFromFiles(fileNames: string[]): { ecosystem: ProjectEcosystem; mainFile: string } | null {
  const lower = fileNames.map((f) => f.toLowerCase());

  if (lower.includes("package.json")) {
    return { ecosystem: "node", mainFile: "package.json" };
  }
  if (lower.includes("cargo.toml")) {
    return { ecosystem: "rust", mainFile: "Cargo.toml" };
  }
  if (lower.includes("pyproject.toml") || lower.includes("requirements.txt")) {
    return { ecosystem: "python", mainFile: lower.includes("pyproject.toml") ? "pyproject.toml" : "requirements.txt" };
  }
  if (lower.includes("go.mod")) {
    return { ecosystem: "go", mainFile: "go.mod" };
  }
  if (lower.includes("pom.xml") || lower.includes("build.gradle") || lower.includes("build.gradle.kts")) {
    return { ecosystem: "java", mainFile: lower.includes("pom.xml") ? "pom.xml" : "build.gradle" };
  }
  if (lower.some((f) => f.endsWith(".csproj") || f.endsWith(".sln"))) {
    const cs = fileNames.find((f) => f.endsWith(".csproj") || f.endsWith(".sln"))!;
    return { ecosystem: "dotnet", mainFile: cs };
  }

  return null;
}

export function parseProjectManifest(ecosystem: ProjectEcosystem, rawContent: string, projectPath: string): ProjectManifest {
  const folderName = projectPath.split(/[/\\]/).filter(Boolean).pop() || "Untitled Project";

  if (ecosystem === "node") {
    try {
      const pkg = JSON.parse(rawContent);
      let framework = "Node.js";
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps.next) framework = "Next.js";
      else if (allDeps.vite) framework = "Vite";
      else if (allDeps.react) framework = "React";
      else if (allDeps["@nestjs/core"]) framework = "NestJS";
      else if (allDeps.vue) framework = "Vue";
      else if (allDeps.express) framework = "Express";
      else if (allDeps.electron) framework = "Electron";

      let pm: ProjectManifest["packageManager"] = "npm";
      if (rawContent.includes("pnpm") || projectPath.includes("pnpm-lock.yaml")) pm = "pnpm";
      else if (projectPath.includes("yarn.lock")) pm = "yarn";
      else if (projectPath.includes("bun.lockb")) pm = "bun";

      return {
        name: pkg.name || folderName,
        version: pkg.version,
        ecosystem: "node",
        framework,
        packageManager: pm,
        scripts: pkg.scripts || { dev: "vite", build: "vite build" },
        path: projectPath,
      };
    } catch {}
  }

  if (ecosystem === "rust") {
    const nameMatch = rawContent.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = rawContent.match(/version\s*=\s*"([^"]+)"/);
    return {
      name: nameMatch ? nameMatch[1] : folderName,
      version: versionMatch ? versionMatch[1] : "0.1.0",
      ecosystem: "rust",
      framework: rawContent.includes("actix") ? "Actix-Web" : rawContent.includes("axum") ? "Axum" : "Rust Binary",
      packageManager: "cargo",
      scripts: {
        dev: "cargo run",
        build: "cargo build --release",
        test: "cargo test",
        lint: "cargo clippy",
      },
      path: projectPath,
    };
  }

  if (ecosystem === "python") {
    let framework = "Python";
    if (rawContent.includes("fastapi")) framework = "FastAPI";
    else if (rawContent.includes("django")) framework = "Django";
    else if (rawContent.includes("flask")) framework = "Flask";

    return {
      name: folderName,
      ecosystem: "python",
      framework,
      packageManager: rawContent.includes("[tool.poetry]") ? "poetry" : "pip",
      scripts: {
        dev: framework === "FastAPI" ? "uvicorn main:app --reload" : "python main.py",
        test: "pytest",
        lint: "flake8 .",
      },
      path: projectPath,
    };
  }

  if (ecosystem === "go") {
    const modMatch = rawContent.match(/module\s+([^\s]+)/);
    return {
      name: modMatch ? modMatch[1].split("/").pop() || folderName : folderName,
      ecosystem: "go",
      framework: rawContent.includes("gin-gonic") ? "Gin" : rawContent.includes("fiber") ? "Fiber" : "Go Standard",
      packageManager: "go",
      scripts: {
        dev: "go run .",
        build: "go build -o app",
        test: "go test ./...",
      },
      path: projectPath,
    };
  }

  if (ecosystem === "java") {
    const isGradle = projectPath.toLowerCase().includes("gradle");
    return {
      name: folderName,
      ecosystem: "java",
      framework: rawContent.includes("spring-boot") ? "Spring Boot" : "Java Application",
      packageManager: isGradle ? "gradle" : "maven",
      scripts: isGradle
        ? { dev: "./gradlew bootRun", build: "./gradlew build", test: "./gradlew test" }
        : { dev: "mvn spring-boot:run", build: "mvn clean package", test: "mvn test" },
      path: projectPath,
    };
  }

  if (ecosystem === "dotnet") {
    return {
      name: folderName,
      ecosystem: "dotnet",
      framework: rawContent.includes("Microsoft.AspNetCore") ? "ASP.NET Core" : ".NET Application",
      packageManager: "dotnet",
      scripts: {
        dev: "dotnet run",
        build: "dotnet build",
        test: "dotnet test",
      },
      path: projectPath,
    };
  }

  return {
    name: folderName,
    ecosystem,
    packageManager: "npm",
    scripts: { dev: "start", build: "build" },
    path: projectPath,
  };
}
