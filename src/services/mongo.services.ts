import { MongoClient, type Document } from 'mongodb';

export interface AggregationGroupResult {
  _id: {
    company: string;
    riskEntity: string;
    clipType?: string;
    insuranceCompany?: string;
  };
  totalReserves?: number;
  totalFeesAndTax?: number;
  totalClaims?: number;
}

export class DatabaseService {
  private client: MongoClient;
  
  constructor(){
    this.client = new MongoClient(process.env.MONGO_URI!);

    
  }
async getContracts(){

    try {
        console.log("Attempting to connect to MongoDB...");
        await this.client.connect();
        console.log("Successfully connected to MongoDB!");

        const db=this.client.db("ContractDataDB");
        const collections= db.collection("ContractData");

        const query={
        
        };

        return await collections.find(query).toArray();
    } catch (error) {
        console.error("\n MongoDB connection failed!");
        console.error("If you are getting a timeout, ensure your current IP address is added to the MongoDB Atlas Network Access allowlist.\n");
        console.error("Detailed Error:", error);
        throw error;
    }

}

async getFinancialAggregations(): Promise<[AggregationGroupResult[], AggregationGroupResult[], AggregationGroupResult[], any[]]> {
    try {
        console.log("Attempting to connect to MongoDB for Financial Aggregations...");
        await this.client.connect();

        // Fix: MongoDB Database names are Case-Sensitive!
        const contractDB = this.client.db("ContractDataDB").collection("ContractData");
        const cancelDB = this.client.db("CancelDataDB").collection("CancelData");
        const claimDB = this.client.db("ClaimDataDB").collection("ClaimData_Claim");

        const contractProject: Document = {
                $addFields: {
                    _recordType: "Contract",
                    _recordId: { $ifNull: ["$metadata.Contract#", { $toString: "$_id" }] },
                    company: { $ifNull: ["$CalculatedFields.Company", { $ifNull: ["$metadata.Company", "UNKNOWN"] }] },
                    riskEntity: { $ifNull: ["$CalculatedFields.RiskEntity", { $ifNull: ["$metadata.RiskEntity", "UNKNOWN"] }] },
                    clipType: { $ifNull: ["$CalculatedFields.CLIPType", "UNKNOWN"] },
                    insuranceCompany: { $ifNull: ["$metadata.InsuranceCompany", "UNKNOWN"] },
                    reserves: {
                        $add: [
                            { $convert: { input: "$WrittenAmount.RESERVE.BASERESERVE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.BASERESERVEFTP", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.SURCHARGE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.SURCHARGERESERVE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.SIRESERVES", to: "double", onError: 0, onNull: 0 } }
                        ]
                    },
                    feesAndTax: {
                        $add: [
                            { $convert: { input: "$WrittenAmount.RESERVE.CEDINGFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.CLIPFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.OBLIGORFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$WrittenAmount.RESERVE.PREMIUMTAX", to: "double", onError: 0, onNull: 0 } }
                        ]
                    }
                }
        };

        const contractGroup: Document = {
            $group: {
                    _id: { 
                        company: "$company", 
                        riskEntity: "$riskEntity",
                        clipType: "$clipType",
                        insuranceCompany: "$insuranceCompany"
                    },
                    totalReserves: { $sum: "$reserves" },
                    totalFeesAndTax: { $sum: "$feesAndTax" }
                }
        };

        const cancelProject: Document = {
                $addFields: {
                    _recordType: "Cancel",
                    _recordId: { $ifNull: ["$metadata.Contract#", { $toString: "$_id" }] },
                    company: { $ifNull: ["$CalculatedFields.Company", { $ifNull: ["$metadata.Company", "UNKNOWN"] }] },
                    riskEntity: { $ifNull: ["$CalculatedFields.RiskEntity", { $ifNull: ["$metadata.RiskEntity", "UNKNOWN"] }] },
                    clipType: { $ifNull: ["$CalculatedFields.CLIPType", "UNKNOWN"] },
                    insuranceCompany: { $ifNull: ["$metadata.InsuranceCompany", "UNKNOWN"] },
                    reserves: {
                        $add: [
                            { $convert: { input: "$CancelledAmount.RESERVE.BASERESERVE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.BASERESERVEFTP", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.SIRESERVES", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.SURCHARGE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.SURCHARGERESERVE", to: "double", onError: 0, onNull: 0 } }
                        ]
                    },
                    feesAndTax: {
                        $add: [
                            { $convert: { input: "$CancelledAmount.RESERVE.CEDINGFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.CLIPFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.OBLIGORFEE", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$CancelledAmount.RESERVE.PREMIUMTAX", to: "double", onError: 0, onNull: 0 } }
                        ]
                    }
                }
        };

        const cancelGroup: Document = {
            $group: {
                    _id: { 
                        company: "$company", 
                        riskEntity: "$riskEntity",
                        clipType: "$clipType",
                        insuranceCompany: "$insuranceCompany"
                    },
                    totalReserves: { $sum: "$reserves" },
                    totalFeesAndTax: { $sum: "$feesAndTax" }
                }
        };

        const claimProject: Document = {
                $addFields: {
                    _recordType: "Claim",
                    _recordId: { $ifNull: ["$Claim Number", { $toString: "$_id" }] },
                    company: { $ifNull: ["$CalculatedFields.Company", { $ifNull: ["$Company", "UNKNOWN"] }] },
                    clipType: { $ifNull: ["$CalculatedFields.CLIPType", { $ifNull: ["$CLIP Type (Calc)", "UNKNOWN"] }] },
                    insuranceCompany: { $ifNull: ["$Insurer", "UNKNOWN"] },
                    riskEntity: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: { $ifNull: ["$Insurer", ""] }, regex: /Old Republic/i } }, then: "OLD REPUBLIC" },
                                { case: { $regexMatch: { input: { $ifNull: ["$Insurer", ""] }, regex: /Fortegra/i } }, then: "FORTEGRA" }
                            ],
                            default: "$Risk Entity"
                        }
                    },
                    claimAmount: { $convert: { input: "$Total Paid Amount", to: "double", onError: 0, onNull: 0 } }
                }
        };

        const claimGroup: Document = {
            $group: {
                    _id: { 
                        company: "$company", 
                        riskEntity: "$riskEntity",
                        clipType: "$clipType",
                        insuranceCompany: "$insuranceCompany" 
                    },
                    totalClaims: { $sum: "$claimAmount" }
                }
        };

        const [contracts, cancels, claims, rawContracts, rawCancels, rawClaims] = await Promise.all([
            contractDB.aggregate<AggregationGroupResult>([contractProject, contractGroup]).toArray(),
            cancelDB.aggregate<AggregationGroupResult>([cancelProject, cancelGroup]).toArray(),
            claimDB.aggregate<AggregationGroupResult>([claimProject, claimGroup]).toArray(),
            contractDB.aggregate<any>([contractProject]).toArray(),
            cancelDB.aggregate<any>([cancelProject]).toArray(),
            claimDB.aggregate<any>([claimProject]).toArray()
        ]);

        return [contracts, cancels, claims, [...rawContracts, ...rawCancels, ...rawClaims]];
    } catch (error) {
        console.error("Failed to execute financial aggregations:", error);
        throw error;
    }
}

async close (){
    try {
        await this.client.close();
        console.log("MongoDB connection gracefully closed.");
    } catch (error) {
        console.error("Failed to close MongoDB connection:", error);
    }
}




}
