import { Injectable, inject } from "@angular/core";
import { from } from 'rxjs';
import { Api } from '../api/api';
import { healthcheckHealthcheckGet, databasecheckDatabasecheckGet, getGraphGraphGet, getListListGet } from "../api/functions";

@Injectable({
  providedIn: 'root',
})

export class STEMgraphApiService {
  private readonly api = inject(Api);

  Healthcheck() {
    return from(this.api.invoke(healthcheckHealthcheckGet));
  }
  
  Databasecheck() {
    return from(this.api.invoke(databasecheckDatabasecheckGet));
  }

  MainGraph() {
    return from(this.api.invoke(getGraphGraphGet));
  }

  MainList() {
    return from(this.api.invoke(getListListGet));
  }
}
