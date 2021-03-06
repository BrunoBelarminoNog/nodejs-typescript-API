import { InternalError } from '../util/errors/internal-error';
// import { AxiosStatic } from 'axios';
import config, {IConfig} from 'config';
import * as HTTPUtil from '@src/util/request';


export interface StormGlassPointsSource {
  [key: string]: number;
}

export interface StormGlassPoint {
  readonly time: string;
  readonly waveHeight: StormGlassPointsSource;
  readonly waveDirection: StormGlassPointsSource;
  readonly swellHeight: StormGlassPointsSource;
  readonly swellDirection: StormGlassPointsSource;
  readonly swellPeriod: StormGlassPointsSource;
  readonly windDirection: StormGlassPointsSource;
  readonly windSpeed: StormGlassPointsSource;
}

export interface StormGlassForecastResponse {
  hours: StormGlassPoint[];
}

export interface ForecastPoint {
  time: string;
  waveHeight: number;
  waveDirection: number;
  swellDirection: number;
  swellHeight: number;
  swellPeriod: number;
  windDirection: number;
  windSpeed: number;
}

export class ClientRequestError extends InternalError {
  constructor(message: string) {
    const internalMessage = `Unexpected error when trying to communicate to StormGlass`;

    super(`${internalMessage}: ${message}`)
  }
}

export class StormGlassResponseError extends InternalError {
  constructor(message: string) {
    const internalMessage =
      'Unexpected error returned by the StormGlass service';
    super(`${internalMessage}: ${message}`);
  }
}

const stormGlassResourceConfig: IConfig = config.get('App.resources.StormGlass')


export class StormGlass {
  readonly stormGlassAPIParams =
    'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
  readonly stormGlassAPISource = 'noaa';

  constructor(protected request = new HTTPUtil.Request()) {}

  public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {
      try {
        const response = await this.request.get<StormGlassForecastResponse>(
            `${stormGlassResourceConfig.get('apiUrl')}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassAPIParams}&source=${this.stormGlassAPISource}`,
            {
              headers: {
                Authorization: stormGlassResourceConfig.get('apiToken'),
              },
            }
          );

        return this.normalizedResponse(response.data);
      } catch (err) {

        if(HTTPUtil.Request.isRequestError(err)) {
          throw new StormGlassResponseError(`Error: ${JSON.stringify(err.response.data)} Code: ${err.response.status}`)
        }
        throw new ClientRequestError(err.message)
      }
  }

  private normalizedResponse(
    points: StormGlassForecastResponse
  ): ForecastPoint[] {
    return points.hours.filter(this.isValidPoint.bind(this)).map((point) => ({
      swellDirection: point.swellDirection[this.stormGlassAPISource],
      swellHeight: point.swellHeight[this.stormGlassAPISource],
      swellPeriod: point.swellPeriod[this.stormGlassAPISource],
      time: point.time,
      waveDirection: point.waveDirection[this.stormGlassAPISource],
      waveHeight: point.waveHeight[this.stormGlassAPISource],
      windDirection: point.windDirection[this.stormGlassAPISource],
      windSpeed: point.windSpeed[this.stormGlassAPISource],
    }));
  }

  private isValidPoint(point: Partial<StormGlassPoint>): boolean {
    if (
      point.time &&
      point.swellDirection?.[this.stormGlassAPISource] &&
      point.swellHeight?.[this.stormGlassAPISource] &&
      point.swellPeriod?.[this.stormGlassAPISource] &&
      point.waveDirection?.[this.stormGlassAPISource] &&
      point.waveHeight?.[this.stormGlassAPISource] &&
      point.windDirection?.[this.stormGlassAPISource] &&
      point.windSpeed?.[this.stormGlassAPISource]
    ) {
      return true;
    }
    return false;
  }
}
