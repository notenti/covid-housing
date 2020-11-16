#!/usr/bin/env python
import argparse
import pandas as pd
import numpy as np

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Clean and Join Datasets')
    parser.add_argument('--covid', type=str, nargs="?", help="Path to coronavirus dataset")
    parser.add_argument('--housing', type=str, nargs="?", help="Path to housing dataset")
    parser.add_argument('--forecast', type=str, nargs="?", help="Path to forecasted dataset")
    parser.add_argument('--output', type=str, nargs="?", help="Path to joined dataset")

    args = parser.parse_args()

    # Parse Covid dataset
    covid_columns = ["date", "country_code", "subregion1_name", "subregion2_name",
                     "subregion2_code", "new_confirmed", "new_deceased", "total_confirmed", "population"]

    data_types = dict(zip(covid_columns[1:], ["str"] * 4 + ["Int64"] * 4))

    covid_df = pd.read_csv(args.covid, usecols=covid_columns,
                           parse_dates=[0], dtype=data_types)
    covid_df = covid_df[covid_df.country_code == "US"]
    covid_df = covid_df[covid_df.subregion2_code.notna()]
    covid_df["year_month_day"] = covid_df.date.dt.strftime("%Y%m%d")
    covid_df = covid_df.rename(columns = {"subregion2_code": "county_fips"})

    # This is temporary based on the trained data
    covid_df = covid_df[covid_df["date"] < "2020-10-26"]

    # Parse Housing dataset
    housing_df = pd.read_csv(args.housing,
                             dtype={"RegionID": "Int64", "SizeRank": "Int64",
                                    "RegionName": "str", "State": "str",
                                    "Metro": "str", "StateCodeFIPS": "str",
                                    "MunicipalCodeFIPS": "str"})
    housing_df = pd.melt(housing_df,id_vars=["RegionID", "SizeRank", "RegionName", "StateName", "State", "RegionType", "Metro", "StateCodeFIPS", "MunicipalCodeFIPS"])
    housing_df = housing_df.rename(columns = {"variable": "date", "value": "Zhvi"})
    housing_df["StateCodeFIPS"] = housing_df["StateCodeFIPS"].map(lambda x: "0" + x if len(x) == 1 else x)
    housing_df["StateCodeFIPS"] = housing_df["StateCodeFIPS"].map(lambda x: "00" if len(x) == 0 else x)
    housing_df["MunicipalCodeFIPS"] = housing_df["MunicipalCodeFIPS"].map(lambda x: "0" + x if len(x) == 2 else x)
    housing_df["MunicipalCodeFIPS"] = housing_df["MunicipalCodeFIPS"].map(lambda x: "00" + x if len(x) == 1 else x)
    housing_df["MunicipalCodeFIPS"] = housing_df["MunicipalCodeFIPS"].map(lambda x: "000" if len(x) == 0 else x)
    housing_df["county_fips"] = housing_df["StateCodeFIPS"].str.cat(housing_df["MunicipalCodeFIPS"])
    housing_df["year_month_day"] = housing_df["date"].map(lambda x: x.replace("-", ""))
    housing_df = housing_df.drop(columns="date")

    # Joined dataset
    joined_df = pd.merge(covid_df, housing_df, on=["year_month_day", "county_fips"], how="left")
    joined_df = joined_df[['date', 'county_fips', 'population', 'total_confirmed', 'new_confirmed', 'Zhvi']]
    joined_df["Zhvi"] = joined_df.groupby("county_fips")["Zhvi"].apply(lambda g: g.interpolate(method="spline", order=3, limit_direction="both"))

    # Forecasted dataset
    if args.forecast is not None:
        forecast_df = pd.read_csv(args.forecast,
                dtype={"county_fips": "str", "confirmed_cases": "Int64", "zhvi": "float"},
                parse_dates=[1])
        forecast_df = forecast_df.rename(columns = {"zhvi": "Zhvi", "confirmed_cases": "total_confirmed"})
        forecast_df["county_fips"] = forecast_df["county_fips"].map(lambda x: "0" + x if len(x) == 4 else x)
        forecast_df["county_fips"] = forecast_df["county_fips"].map(lambda x: "00" + x if len(x) == 3 else x)
        # forecast_df.loc[forecast_df.date.dt.strftime("%d") != "01", "Zhvi"] = np.nan
        joined_df = joined_df.append(forecast_df, ignore_index = True)
        joined_df.sort_values(["county_fips", "date"], inplace=True)
        joined_df["population"] = joined_df["population"].fillna(method="backfill")

    joined_df["new_confirmed"] = joined_df.groupby("county_fips")["total_confirmed"].diff().shift(-1)

    # Output to csv
    joined_df.to_csv(args.output)
