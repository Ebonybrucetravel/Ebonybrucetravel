import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

const MARKUP_PERCENTAGE = 10; // 10%
const SERVICE_FEE_PERCENTAGE = 5; // 5%
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

@Injectable()
export class SelectWakanowFlightUseCase {
  private readonly logger = new Logger(SelectWakanowFlightUseCase.name);

  constructor(private readonly wakanowService: WakanowService) {}

  async execute(dto: SelectWakanowFlightDto) {
    const { selectData, targetCurrency = 'NGN' } = dto;

    this.logger.log('Selecting Wakanow flight offer...');
    this.logger.log(`SelectData length: ${selectData?.length || 0}`);

    if (!selectData) {
      throw new BadRequestException('Missing selectData. Please search for flights again.');
    }

    if (selectData.length < 10) {
      throw new BadRequestException('Invalid selectData (too short). Please search for flights again.');
    }

    this.logger.log(`SelectData preview: ${selectData.substring(0, 50)}...`);

    const selectDataVariants = this.generateSelectDataVariants(selectData);
    this.logger.log(`Generated ${selectDataVariants.length} SelectData variants to try`);

    let lastError: any = null;
    let selectResponse = null;

    for (let variantIndex = 0; variantIndex < selectDataVariants.length; variantIndex++) {
      const variant = selectDataVariants[variantIndex];
      this.logger.log(`Trying variant ${variantIndex + 1}/${selectDataVariants.length}: ${variant.name} (length: ${variant.data.length})`);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          this.logger.log(`Attempt ${attempt}/${MAX_RETRIES} with variant ${variant.name}...`);

          selectResponse = await this.wakanowService.selectFlight({
            SelectData: variant.data,
            TargetCurrency: targetCurrency,
          });

          if (selectResponse) {
            this.logger.log(`✅ Successfully selected flight with variant: ${variant.name} on attempt ${attempt}`);
            break;
          }

        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message?.toLowerCase() || '';
          const errorString = JSON.stringify(error)?.toLowerCase() || '';

          const errorStatus = error?.status || 
                             error?.response?.status || 
                             error?.response?.statusCode || 
                             error?.statusCode || 
                             error?.code || 
                             0;

          if (error.message === 'SELECTION_EXPIRED') {
            this.logger.warn(`Variant ${variant.name} attempt ${attempt}: Selection expired`);
            break;
          }

          const isExpired = errorMsg.includes('expired') ||
                            errorMsg.includes('selectdata') ||
                            errorMsg.includes('bad request') ||
                            errorMsg.includes('an error has occured') ||
                            errorMsg.includes('selected flights not available') ||
                            errorString.includes('expired') ||
                            errorString.includes('selectdata') ||
                            errorString.includes('bad request') ||
                            errorString.includes('an error has occured') ||
                            errorString.includes('selected flights not available');

          if (isExpired) {
            this.logger.warn(`Variant ${variant.name} attempt ${attempt}: Expired error`);
            break;
          }

          if (errorStatus === 500 && attempt < MAX_RETRIES) {
            this.logger.warn(`Variant ${variant.name} attempt ${attempt} failed with 500, retrying in ${RETRY_DELAY * attempt}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            continue;
          }

          if (errorStatus === 400 && attempt < 2) {
            this.logger.warn(`Variant ${variant.name} attempt ${attempt} failed with 400, retrying once...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            continue;
          }

          this.logger.warn(`Variant ${variant.name} attempt ${attempt} failed: ${error.message}`);
          break;
        }
      }

      if (selectResponse) {
        break;
      }
    }

    if (!selectResponse) {
      this.logger.error('All variants and retry attempts failed');
      throw new BadRequestException(
        'Unable to confirm flight pricing. Please try searching again.'
      );
    }

    if (!selectResponse) {
      throw new BadRequestException('No response from Wakanow. Please search again.');
    }

    if (!selectResponse.HasResult) {
      throw new BadRequestException('Selected flight is no longer available. Please search again.');
    }

    if (!selectResponse.FlightSummaryModel) {
      this.logger.error('Missing FlightSummaryModel in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Invalid response from Wakanow. Please search again.');
    }

    const combo = selectResponse.FlightSummaryModel.FlightCombination;

    if (!combo) {
      this.logger.error('Missing FlightCombination in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Flight data is incomplete. Please search again.');
    }

    if (!combo.FlightModels || combo.FlightModels.length === 0) {
      this.logger.error('No FlightModels in response:', JSON.stringify(combo));
      throw new BadRequestException('No flight segments found. Please search again.');
    }

    const totalAmount = combo.Price?.Amount || 0;
    const currency = combo.Price?.CurrencyCode || targetCurrency || 'NGN';
    
    const markupPct = MARKUP_PERCENTAGE;
    const servicePct = SERVICE_FEE_PERCENTAGE;
    const totalFactor = 1 + (markupPct / 100) + (servicePct / 100);
    
    const basePrice = totalAmount / totalFactor;
    const markupAmount = (basePrice * markupPct) / 100;
    const serviceFee = (basePrice * servicePct) / 100;
    
    const roundedBasePrice = Math.round(basePrice * 100) / 100;
    const roundedMarkup = Math.round(markupAmount * 100) / 100;
    const roundedServiceFee = Math.round(serviceFee * 100) / 100;
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    
    const combinedTaxes = roundedMarkup + roundedServiceFee;
    const combinedTaxPercentage = markupPct + servicePct;

    const priceBreakdown = {
      basePrice: roundedBasePrice,
      markupAmount: roundedMarkup,
      markupPercentage: markupPct,
      serviceFee: roundedServiceFee,
      serviceFeePercentage: servicePct,
      taxes: combinedTaxes,
      taxPercentage: combinedTaxPercentage,
      totalAmount: roundedTotal,
      currency: currency,
    };

    this.logger.log(
      `✅ Wakanow flight selected. BookingId: ${selectResponse.BookingId}, ` +
      `Base: ${roundedBasePrice}, Markup: ${roundedMarkup}, Service: ${roundedServiceFee}, ` +
      `Taxes: ${combinedTaxes}, Total: ${roundedTotal} ${currency}`,
    );

    this.logger.log('💰 Price breakdown:', priceBreakdown);

    return {
      provider: 'WAKANOW',
      bookingId: selectResponse.BookingId || null,
      selectData: selectResponse.SelectData || selectData,
      isPriceMatched: selectResponse.IsPriceMatched || false,
      isPassportRequired: selectResponse.IsPassportRequired || false,
      
      priceBreakdown: priceBreakdown,
      
      basePrice: roundedBasePrice,
      markupAmount: roundedMarkup,
      markupPercentage: markupPct,
      serviceFee: roundedServiceFee,
      serviceFeePercentage: servicePct,
      taxes: combinedTaxes,
      taxPercentage: combinedTaxPercentage,
      totalAmount: roundedTotal,
      currency: currency,
      
      flightSummary: {
        slices: (combo.FlightModels || []).map((fm) => ({
          airline: fm.AirlineName || fm.Airline || '',
          airlineCode: fm.Airline || '',
          airlineLogo: fm.AirlineLogoUrl || '',
          departureCode: fm.DepartureCode || '',
          departureName: fm.DepartureName || '',
          departureTime: fm.DepartureTime || '',
          arrivalCode: fm.ArrivalCode || '',
          arrivalName: fm.ArrivalName || '',
          arrivalTime: fm.ArrivalTime || '',
          stops: fm.Stops || 0,
          tripDuration: fm.TripDuration || '',
          segments: (fm.FlightLegs || []).map((leg) => ({
            flightNumber: leg.FlightNumber || '',
            departureCode: leg.DepartureCode || '',
            departureName: leg.DepartureName || '',
            destinationCode: leg.DestinationCode || '',
            destinationName: leg.DestinationName || '',
            startTime: leg.StartTime || '',
            endTime: leg.EndTime || '',
            duration: leg.Duration || '',
            cabinClass: leg.CabinClassName || '',
            operatingCarrier: leg.OperatingCarrierName || '',
            aircraft: leg.Aircraft || '',
            layover: leg.Layover || null,
            layoverDuration: leg.LayoverDuration || '',
          })),
          freeBaggage: fm.FreeBaggage || null,
        })),
        price: combo.Price || { Amount: 0, CurrencyCode: currency },
        priceDetails: combo.PriceDetails || [],
        isRefundable: combo.IsRefundable || false,
      },
      fareRules: combo.FareRules || [],
      penaltyRules: combo.PenaltyRules || null,
      termsAndConditions: selectResponse.ProductTermsAndConditions || {
        TermsAndConditions: [],
        TermsAndConditionImportantNotice: '',
      },
      customMessages: selectResponse.CustomMessages || [],
      message: 'Flight pricing confirmed',
    };
  }

  /**
   * Generate different variants of SelectData to try
   */
  private generateSelectDataVariants(originalSelectData: string): Array<{ name: string; data: string }> {
    const variants: Array<{ name: string; data: string }> = [];

    // 1. Original
    variants.push({ name: 'Original', data: originalSelectData });

    // 2. Trimmed
    const trimmed = originalSelectData.trim();
    if (trimmed !== originalSelectData) {
      variants.push({ name: 'Trimmed', data: trimmed });
    }

    // 3. Shortened versions
    if (originalSelectData.length > 500) {
      variants.push({ name: 'Shortened_500', data: originalSelectData.substring(0, 500) });
      variants.push({ name: 'Shortened_200', data: originalSelectData.substring(0, 200) });
    }

    // 4. Base64 decode
    try {
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (base64Regex.test(originalSelectData)) {
        const decoded = Buffer.from(originalSelectData, 'base64').toString('utf-8');
        if (decoded && decoded.length > 0) {
          const trimmedDecoded = decoded.trim();
          if (trimmedDecoded.length > 10) {
            variants.push({ name: 'Base64Decoded', data: trimmedDecoded });
            if (trimmedDecoded.length > 500) {
              variants.push({ name: 'Base64Decoded_500', data: trimmedDecoded.substring(0, 500) });
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Failed to decode Base64:', e.message);
    }

    // 5. URL-safe Base64 decode
    try {
      const urlSafeBase64 = originalSelectData.replace(/-/g, '+').replace(/_/g, '/');
      if (urlSafeBase64 !== originalSelectData) {
        const decoded = Buffer.from(urlSafeBase64, 'base64').toString('utf-8');
        if (decoded && decoded.length > 10) {
          const trimmedDecoded = decoded.trim();
          variants.push({ name: 'URLSafeBase64Decoded', data: trimmedDecoded });
        }
      }
    } catch (e) {
      this.logger.debug('Failed to decode URL-safe Base64:', e.message);
    }

    // 6. Gzip decompression
    try {
      if (originalSelectData.startsWith('7h4AAB+LCAAAAAAABAD') || 
          originalSelectData.startsWith('H4sI') ||
          originalSelectData.includes('LCAAAAAAABAD')) {
        
        const buffer = Buffer.from(originalSelectData, 'base64');
        if (buffer.length > 2 && buffer[0] === 0x1F && buffer[1] === 0x8B) {
          const zlib = require('zlib');
          const decompressed = zlib.gunzipSync(buffer);
          const result = decompressed.toString('utf-8');
          
          if (result && result.length > 10) {
            variants.push({ name: 'GzipDecompressed', data: result });
            if (result.length > 500) {
              variants.push({ name: 'GzipDecompressed_500', data: result.substring(0, 500) });
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Failed to decompress gzip:', e.message);
    }

    // 7. Remove common prefixes
    const prefixes = ['WAAAAB+LCAAAAAAABAC', '7h4AAB+LCAAAAAAABAD'];
    for (const prefix of prefixes) {
      if (originalSelectData.startsWith(prefix)) {
        const withoutPrefix = originalSelectData.substring(prefix.length);
        if (withoutPrefix.length > 50) {
          variants.push({ name: `WithoutPrefix_${prefix.substring(0, 10)}`, data: withoutPrefix });
        }
      }
    }

    // 8. Deduplicate
    const seen = new Set<string>();
    const uniqueVariants = variants.filter(v => {
      const key = v.data.substring(0, 100);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    this.logger.log(`Generated ${uniqueVariants.length} unique SelectData variants`);
    return uniqueVariants;
  }
}