import dotenv from 'dotenv';
dotenv.config();
import { DatabaseService } from './services/mongo.services.js';
import { ReportTransformer } from './utils/report.transformer.js';
import { ExcelService } from './services/excel.services.js';
import { EmailService } from './services/email.services.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dbService = new DatabaseService();
  const excelService = new ExcelService();
  const emailService = new EmailService();
  
  try {
    console.log(`\n==============================================`);
    console.log(`Generating Report for All Records`);
    console.log(`==============================================\n`);

    const [contracts, cancels, claims, rawData] = await dbService.getFinancialAggregations();
    const finalReport = ReportTransformer.generateFinancialReport(contracts, cancels, claims);
    
    console.log(JSON.stringify(finalReport, null, 2));

    // Calculate the activation month (Previous Month) for the Excel label
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const reportMonth = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-');

    // Generate the Excel File at the root of the project
    const outputPath = path.join(__dirname, '..', 'Insurance_Remittance_Report.xlsx');
    await excelService.generateExcelReport(finalReport, rawData, outputPath, reportMonth);
    console.log(`\n✅ Excel report successfully generated at:\n📁 ${outputPath}\n`);

    // Send Email
    await emailService.sendReportEmail(outputPath);

  } catch (error) {
    console.error("\n❌ An error occurred during report generation:", error);
  } finally {
    await dbService.close();
  }
}

main();