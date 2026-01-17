import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AirportDto {
  @ApiProperty({ description: 'IATA airport code' })
  iata_code: string;

  @ApiProperty({ description: 'Airport name' })
  name: string;

  @ApiProperty({ description: 'City name' })
  city_name: string;

  @ApiProperty({ description: 'Time zone' })
  time_zone: string;
}

export class AirlineDto {
  @ApiProperty({ description: 'Airline name' })
  name: string;

  @ApiPropertyOptional({ description: 'IATA airline code' })
  iata_code: string | null;

  @ApiPropertyOptional({ description: 'Logo symbol URL' })
  logo_symbol_url: string | null;

  @ApiPropertyOptional({ description: 'Logo lockup URL' })
  logo_lockup_url: string | null;
}

export class FlightSegmentDto {
  @ApiProperty({ description: 'Segment ID' })
  id: string;

  @ApiProperty({ description: 'Origin airport', type: AirportDto })
  origin: AirportDto;

  @ApiProperty({ description: 'Destination airport', type: AirportDto })
  destination: AirportDto;

  @ApiProperty({ description: 'Departure time (ISO 8601 datetime)' })
  departing_at: string;

  @ApiProperty({ description: 'Arrival time (ISO 8601 datetime)' })
  arriving_at: string;

  @ApiPropertyOptional({ description: 'Duration (ISO 8601 duration)' })
  duration: string | null;

  @ApiProperty({ description: 'Marketing carrier', type: AirlineDto })
  marketing_carrier: AirlineDto;

  @ApiProperty({ description: 'Operating carrier', type: AirlineDto })
  operating_carrier: AirlineDto;

  @ApiProperty({ description: 'Marketing carrier flight number' })
  marketing_carrier_flight_number: string;

  @ApiPropertyOptional({ description: 'Operating carrier flight number' })
  operating_carrier_flight_number: string | null;

  @ApiProperty({ description: 'Aircraft information' })
  aircraft: {
    name: string;
    iata_code: string;
  };
}

export class FlightSliceDto {
  @ApiProperty({ description: 'Slice ID' })
  id: string;

  @ApiProperty({ description: 'Origin airport', type: AirportDto })
  origin: AirportDto;

  @ApiProperty({ description: 'Destination airport', type: AirportDto })
  destination: AirportDto;

  @ApiPropertyOptional({ description: 'Total duration (ISO 8601 duration)' })
  duration: string | null;

  @ApiProperty({ description: 'Flight segments', type: [FlightSegmentDto] })
  segments: FlightSegmentDto[];
}

export class FlightOfferDto {
  @ApiProperty({ description: 'Offer ID (use this to create a booking)' })
  id: string;

  @ApiProperty({ description: 'Total price (including taxes) - original from provider' })
  total_amount: string;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  total_currency: string;

  @ApiProperty({ description: 'Base price (excluding taxes)' })
  base_amount: string;

  @ApiProperty({ description: 'Base currency code' })
  base_currency: string;

  @ApiPropertyOptional({ description: 'Tax amount' })
  tax_amount: string | null;

  @ApiPropertyOptional({ description: 'Tax currency code' })
  tax_currency: string | null;

  @ApiPropertyOptional({ description: 'Carbon emissions (kg)' })
  total_emissions_kg: string | null;

  @ApiProperty({ description: 'Flight slices (outbound and return)', type: [FlightSliceDto] })
  slices: FlightSliceDto[];

  @ApiProperty({ description: 'Airline providing the offer', type: AirlineDto })
  owner: AirlineDto;

  @ApiProperty({ description: 'Offer expiry time (ISO 8601 datetime)' })
  expires_at: string;

  @ApiProperty({ description: 'Payment requirements' })
  payment_requirements: {
    requires_instant_payment: boolean;
    payment_required_by: string | null;
    price_guarantee_expires_at: string | null;
  };

  // Additional fields added by our system
  @ApiProperty({ description: 'Original amount from provider (before markup)' })
  original_amount: string;

  @ApiProperty({ description: 'Markup percentage applied' })
  markup_percentage: number;

  @ApiProperty({ description: 'Markup amount added' })
  markup_amount: string;

  @ApiProperty({ description: 'Final amount (original + markup)' })
  final_amount: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;
}

export class SearchFlightsResponseDto {
  @ApiProperty({ description: 'Offer request ID' })
  offer_request_id: string;

  @ApiProperty({ description: 'Available flight offers', type: [FlightOfferDto] })
  offers: FlightOfferDto[];

  @ApiProperty({ description: 'Whether this is a live mode request' })
  live_mode: boolean;
}

