/**
 * @file packages/server/scripts/cron-weekly-report.ts
 * @description 주간(월~금) 데이터를 PocketBase에서 집계해 Markdown/CSV/XLSX 보고서를 생성합니다.
 */

import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';
import XLSX from 'xlsx';

interface CLIOptions {
  week?: string;
}

interface ReportSummary {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  todosCompleted: number;
  todosInProgress: number;
  todosBacklog: number;
  attendanceCount: number;
  activeProjects: number;
}

interface WeeklyReportConfig {
  obsidianVaultPath?: string;
}

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const REPORT_ROOT = path.resolve(__dirname, '..', '..', '..', 'reports');
const CONFIG_PATH = path.resolve(__dirname, 'weekly-report.config.json');

function parseArgs(): CLIOptions {
  const options: CLIOptions = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--week=')) {
      options.week = arg.split('=')[1];
    }
  }
  return options;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekRange(baseDate: Date) {
  const day = baseDate.getUTCDay();
  const isoDay = day === 0 ? 7 : day; // ISO 주 시작은 월요일
  const monday = new Date(baseDate);
  monday.setUTCDate(baseDate.getUTCDate() - (isoDay - 1));
  monday.setUTCHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  friday.setUTCHours(23, 59, 59, 999);

  return { monday, friday };
}

function getISOWeekNumber(date: Date) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: temp.getUTCFullYear(), week: weekNumber };
}

function ensureDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadConfig(): WeeklyReportConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as WeeklyReportConfig;
  } catch (error) {
    console.warn('⚠️  weekly-report.config.json을 읽는 중 오류 발생:', error);
    return {};
  }
}

async function fetchSummary(pb: PocketBase, monday: Date, friday: Date): Promise<ReportSummary> {
  const weekStart = monday.toISOString();
  const weekEnd = friday.toISOString();

  const todosList = await pb.collection('todos').getList(1, 1, {
    filter: `(updated >= "${weekStart}" && updated <= "${weekEnd}")`
  });
  const todosCompleted = await pb.collection('todos').getList(1, 1, {
    filter: `(status = "po_placed") && (updated >= "${weekStart}" && updated <= "${weekEnd}")`
  });
  const todosBacklog = await pb.collection('todos').getList(1, 1, {
    filter: `(status = "hold") || (status = "incoming")`
  });

  const attendanceList = await pb.collection('attendance').getList(1, 1, {
    filter: `work_date >= "${toISODate(monday)}" && work_date <= "${toISODate(friday)}"`
  });

  const projectList = await pb.collection('projects').getList(1, 1, {
    filter: `status = "in_progress" || status = "planning"`
  });

  const { year, week } = getISOWeekNumber(monday);

  return {
    weekLabel: `${year}-W${String(week).padStart(2, '0')}`,
    weekStart: toISODate(monday),
    weekEnd: toISODate(friday),
    todosCompleted: todosCompleted.totalItems,
    todosInProgress: Math.max(todosList.totalItems - todosCompleted.totalItems, 0),
    todosBacklog: todosBacklog.totalItems,
    attendanceCount: attendanceList.totalItems,
    activeProjects: projectList.totalItems
  };
}

function buildMarkdown(summary: ReportSummary): string {
  return `# 주간 보고서 (${summary.weekLabel})\n\n` +
    `<금주일정>\n- 완료된 업무: ${summary.todosCompleted}건\n- 진행 중 업무: ${summary.todosInProgress}건\n- 근태 체크: ${summary.attendanceCount}회\n\n` +
    `<차주일정>\n- 백로그(보류/입고 예정): ${summary.todosBacklog}건\n- 활성 프로젝트: ${summary.activeProjects}건\n- 차주 목표: 칸반 잠금 규칙 점검 및 보고서 자동화 스크립트 확정\n`;
}

function buildCSV(summary: ReportSummary): string {
  const rows = [
    ['구분', '항목', '값'],
    ['금주', '완료된 업무', summary.todosCompleted.toString()],
    ['금주', '진행 중 업무', summary.todosInProgress.toString()],
    ['금주', '근태 체크', summary.attendanceCount.toString()],
    ['차주', '백로그', summary.todosBacklog.toString()],
    ['차주', '활성 프로젝트', summary.activeProjects.toString()]
  ];
  return rows.map((row) => row.join(',')).join('\n');
}

function buildWorkbook(summary: ReportSummary) {
  const worksheetData = [
    ['Week', summary.weekLabel],
    ['Start', summary.weekStart],
    ['End', summary.weekEnd],
    [],
    ['구분', '항목', '값'],
    ['금주', '완료된 업무', summary.todosCompleted],
    ['금주', '진행 중 업무', summary.todosInProgress],
    ['금주', '근태 체크', summary.attendanceCount],
    ['차주', '백로그', summary.todosBacklog],
    ['차주', '활성 프로젝트', summary.activeProjects]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly');
  return workbook;
}

function writeOutputs(summary: ReportSummary) {
  const outputDir = path.join(REPORT_ROOT, summary.weekLabel);
  ensureDirectory(outputDir);

  const markdownPath = path.join(outputDir, `weekly-${summary.weekLabel}.md`);
  const csvPath = path.join(outputDir, `weekly-${summary.weekLabel}.csv`);
  const xlsxPath = path.join(outputDir, `weekly-${summary.weekLabel}.xlsx`);

  fs.writeFileSync(markdownPath, buildMarkdown(summary), 'utf-8');
  fs.writeFileSync(csvPath, buildCSV(summary), 'utf-8');
  XLSX.writeFile(buildWorkbook(summary), xlsxPath);

  const config = loadConfig();
  if (config.obsidianVaultPath) {
    const vaultPath = path.resolve(config.obsidianVaultPath, `weekly-${summary.weekLabel}.md`);
    ensureDirectory(path.dirname(vaultPath));
    fs.copyFileSync(markdownPath, vaultPath);
  }

  return { markdownPath, csvPath, xlsxPath };
}

async function run() {
  const args = parseArgs();
  const targetDate = args.week ? new Date(args.week) : new Date();
  const { monday, friday } = getWeekRange(targetDate);

  const pb = new PocketBase(POCKETBASE_URL);
  if (process.env.WEEKLY_REPORT_ADMIN_EMAIL && process.env.WEEKLY_REPORT_ADMIN_PASSWORD) {
    await pb.admins.authWithPassword(
      process.env.WEEKLY_REPORT_ADMIN_EMAIL,
      process.env.WEEKLY_REPORT_ADMIN_PASSWORD
    );
  }

  const summary = await fetchSummary(pb, monday, friday);
  const paths = writeOutputs(summary);
  console.log('✅ 주간 보고서 생성 완료:', paths);
}

run().catch((error) => {
  console.error('❌ 주간 보고서 생성 중 오류:', error);
  process.exit(1);
});
