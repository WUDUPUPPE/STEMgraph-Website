import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { healthcheckHealthcheckGet } from "../api/functions";
import { getGraphGraphGet } from "../api/functions";

@Injectable({
  providedIn: 'root',
})

export class STEMgraphApiService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = 'http://localhost:8000';

  Healthcheck() {
    return healthcheckHealthcheckGet(this.http, this.rootUrl);
  }

  MainGraph() {
    return getGraphGraphGet(this.http, this.rootUrl);
  }
}
