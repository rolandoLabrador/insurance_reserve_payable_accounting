import fs from 'fs';
import sgMail from '@sendgrid/mail';

export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  public async sendReportEmail(outputPath: string): Promise<void> {
    console.log(`Preparing to send email to ${process.env.NOTIFICATION_EMAIL}...`);
    
    const attachment = fs.readFileSync(outputPath).toString('base64');
    
    const msg = {
      to: process.env.NOTIFICATION_EMAIL!,
      from: process.env.SYSTEM_SENDER_EMAIL!,
      subject: 'Insurance Remittance Payable Report',
      text: 'Please find the attached Insurance Remittance Payable Report.',
      attachments: [
        {
          content: attachment,
          filename: 'Insurance_Remittance_Report.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: 'attachment',
        },
      ],
    };
    
    await sgMail.send(msg);
    console.log(`📧 Email successfully sent to ${process.env.NOTIFICATION_EMAIL}!\n`);
  }
}