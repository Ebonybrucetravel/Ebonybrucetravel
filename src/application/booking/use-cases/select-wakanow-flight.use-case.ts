import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { SelectWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

// ✅ Configuration constants - move these to your config file
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

    // ✅ Validate selectData
    if (!selectData) {
      throw new BadRequestException('Missing selectData. Please search for flights again.');
    }

    if (selectData.length < 10) {
      throw new BadRequestException('Invalid selectData (too short). Please search for flights again.');
    }

    // ✅ Log a preview of the selectData for debugging
    this.logger.log(`SelectData preview: ${selectData.substring(0, 50)}...`);

    // ✅ Retry logic with exponential backoff
    let lastError: any = null;
    let attempt = 0;
    let selectResponse = null;

    while (attempt < MAX_RETRIES) {
      try {
        attempt++;
        this.logger.log(`Attempt ${attempt}/${MAX_RETRIES} to select flight...`);

        selectResponse = await this.wakanowService.selectFlight({
          SelectData: selectData,
          TargetCurrency: targetCurrency,
        });

        // ✅ If we got a response, break out of the retry loop
        break;

      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorString = JSON.stringify(error)?.toLowerCase() || '';

        // ✅ Get error status from various places
        const errorStatus = error?.status || 
                           error?.response?.status || 
                           error?.response?.statusCode || 
                           error?.statusCode || 
                           error?.code || 
                           0;

        // ✅ Check if it's a SELECTION_EXPIRED from WakanowService
        if (error.message === 'SELECTION_EXPIRED') {
          this.logger.warn(`Attempt ${attempt}: Selection expired, not retrying`);
          throw new BadRequestException('Your flight selection has expired. Please search for flights again.');
        }

        // ✅ Check if it's expired based on message
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
          this.logger.warn(`Attempt ${attempt}: Selection expired, not retrying`);
          throw new BadRequestException('Your flight selection has expired. Please search for flights again.');
        }

        // ✅ If it's a 500 error, retry with delay
        if (errorStatus === 500 && attempt < MAX_RETRIES) {
          this.logger.warn(`Attempt ${attempt} failed with 500, retrying in ${RETRY_DELAY * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          continue;
        }

        // ✅ If it's a 400 error, retry once
        if (errorStatus === 400 && attempt < 2) {
          this.logger.warn(`Attempt ${attempt} failed with 400, retrying once...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }

        // ✅ For other errors, throw immediately
        throw error;
      }
    }

    // ✅ If all retries failed
    if (!selectResponse) {
      this.logger.error('All retry attempts failed');
      throw new BadRequestException(
        'Unable to confirm flight pricing. Please try searching again.'
      );
    }

    // ✅ Check if response is valid
    if (!selectResponse) {
      throw new BadRequestException('No response from Wakanow. Please search again.');
    }

    // ✅ Check if flight is still available
    if (!selectResponse.HasResult) {
      throw new BadRequestException('Selected flight is no longer available. Please search again.');
    }

    // ✅ Check if we have the required data
    if (!selectResponse.FlightSummaryModel) {
      this.logger.error('Missing FlightSummaryModel in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Invalid response from Wakanow. Please search again.');
    }

    const combo = selectResponse.FlightSummaryModel.FlightCombination;

    // ✅ Check if combo exists
    if (!combo) {
      this.logger.error('Missing FlightCombination in response:', JSON.stringify(selectResponse));
      throw new BadRequestException('Flight data is incomplete. Please search again.');
    }

    // ✅ Check if FlightModels exist
    if (!combo.FlightModels || combo.FlightModels.length === 0) {
      this.logger.error('No FlightModels in response:', JSON.stringify(combo));
      throw new BadRequestException('No flight segments found. Please search again.');
    }

    // ✅ Get the total price from Wakanow
    const totalAmount = combo.Price?.Amount || 0;
    const currency = combo.Price?.CurrencyCode || targetCurrency || 'NGN';
    
    // ✅ Calculate price breakdown with markup and service fee as taxes
    const markupPct = MARKUP_PERCENTAGE;
    const servicePct = SERVICE_FEE_PERCENTAGE;
    const totalFactor = 1 + (markupPct / 100) + (servicePct / 100);
    
    // Calculate base price (before markup and service fee)
    const basePrice = totalAmount / totalFactor;
    const markupAmount = (basePrice * markupPct) / 100;
    const serviceFee = (basePrice * servicePct) / 100;
    
    // Round to 2 decimal places
    const roundedBasePrice = Math.round(basePrice * 100) / 100;
    const roundedMarkup = Math.round(markupAmount * 100) / 100;
    const roundedServiceFee = Math.round(serviceFee * 100) / 100;
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    
    // ✅ Combined taxes = markup + service fee (displayed as one line)
    const combinedTaxes = roundedMarkup + roundedServiceFee;
    const combinedTaxPercentage = markupPct + servicePct;

    // ✅ Create the price breakdown object
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

    // ✅ Log the price breakdown for debugging
    this.logger.log('💰 Price breakdown:', priceBreakdown);

    // ✅ Return with camelCase properties for frontend compatibility
    return {
      provider: 'WAKANOW',
      bookingId: selectResponse.BookingId || null,
      selectData: selectResponse.SelectData || selectData,
      isPriceMatched: selectResponse.IsPriceMatched || false,
      isPassportRequired: selectResponse.IsPassportRequired || false,
      
      // ✅ Price breakdown - frontend will display these as-is
      priceBreakdown: priceBreakdown,
      
      // ✅ Also store individual fields for easier access
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
}