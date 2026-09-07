import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { healthcheckHealthcheckGet } from "../api/functions";

@Injectable({
  providedIn: 'root',
})

export class STEMgraphApiService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = 'http://localhost:8000';

  healthcheck() {
    return healthcheckHealthcheckGet(this.http, this.rootUrl);
  }
}
