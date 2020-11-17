function choropleth(counties, states, mesh) {
    const margin = { right: 50, top: 10, left: 50, bottom: 10 };
    const width = 980 - margin.right - margin.left;
    const height = 620 - margin.top - margin.bottom;
    var updateEpoch;
    var updateCovid;
    var updateHousing;
    var updateColors;
    var showText;
    var removeText;
    var epoch = new Date(2020);
    var flattened_covid = [];
    var flattened_housing = [];
    var colors = [];
    var handler;
    var colors_per_class = 0;

    var x = (new_covid_cases, population) => {
        // CDC low population
        if (population < 300000) {
            if (new_covid_cases > 10) {
                return 2;
            } else if (new_covid_cases > 6) {
                return 1;
            } else {
                return 0;
            }
        }
        // CDC high population
        else {
            if (new_covid_cases > 500) {
                return 2;
            } else if (new_covid_cases > 250) {
                return 1;
            } else {
                return 0;
            }
        }
    };
    var y = housing_percent => {
        if (housing_percent > 0.06) {
            return 0;
        } else if (housing_percent > 0.02) {
            return 1;
        } else {
            return 2;
        }
    };

    const bivariateColors = value => {
        if (!value || !value.get(epoch) || !value.get(epoch)[0].Zhvi) return '#ccc';
        let day_of_interest = value.get(epoch)[0];
        let percent_change_in_housing = day_of_interest.percent_change;
        let seven_day_avg_new = day_of_interest.seven_day_avg_new;
        let population = day_of_interest.population;
        return colors[
            y(percent_change_in_housing) + x(seven_day_avg_new, population) * colors_per_class
        ];
    };

    var colorScheme = bivariateColors;

    const housingColors = value => {
        if (!value || !value.get(epoch) || !value.get(epoch)[0].Zhvi) return '#ccc';
        let day_of_interest = value.get(epoch)[0];
        let percent_change_in_housing = day_of_interest.percent_change;
        return colors[y(percent_change_in_housing)];
    };

    const covidColors = value => {
        if (!value || !value.get(epoch) || !value.get(epoch)[0].Zhvi) return '#ccc';
        let day_of_interest = value.get(epoch)[0];
        let seven_day_avg_new = day_of_interest.seven_day_avg_new;
        let population = day_of_interest.population;
        return colors[x(seven_day_avg_new, population) * colors_per_class];
    };

    const generateToolTip = d => {
        let county = d.properties.name;
        let state = states.get(d.id.slice(0, 2)).name;
        if (!d.properties.vals.get(epoch)) {
            return `<p><strong>${county}, ${state}</strong></p>
            <p>No forecasted data available.</p>`;
        }
        let covid_per_population = d3.format('.3p')(
            d.properties.vals.get(epoch)[0].normalized_covid
        );
        let covid_count = d.properties.vals.get(epoch)[0].total_confirmed;
        let new_covid_count = d.properties.vals.get(epoch)[0].new_confirmed;
        let housing = d3.format('($,.0f')(d.properties.vals.get(epoch)[0].Zhvi);
        let percent_change = d3.format('.3p')(d.properties.vals.get(epoch)[0].percent_change);

        if (!d.properties.vals.get(epoch)[0].Zhvi) {
            return `<p><strong>${county}, ${state}</strong></p>
            <table><tbody>
            <tr><td class='wide'>% of population with COVID-19:</td><td> ${covid_per_population}</td></tr>
            <tr><td class='wide'>Confirmed COVID-19 cases:</td><td> ${covid_count}</td></tr>
            <tr><td class='wide'>New COVID-19 cases:</td><td> ${new_covid_count}</td></tr>
            </tbody></table>
            <p>No housing data available.</p>`;
        }
        return `<p><strong>${county}, ${state}</strong></p>
      <table><tbody>
      <tr><td class='wide'>% of population with COVID-19:</td><td> ${covid_per_population}</td></tr>
      <tr><td class='wide'>Confirmed COVID-19 cases:</td><td> ${covid_count}</td></tr>
      <tr><td class='wide'>New COVID-19 cases:</td><td> ${new_covid_count}</td></tr>
      <tr><td class='wide'>Smoothed ZHVI:</td><td> ${housing}</td></tr>
      <tr><td class='wide'>Estimated Annualized ZHVI Change:</td><td> ${percent_change}</td></tr>
      </tbody></table>`;
    };

    function chart(selection) {
        selection.each(function () {
            d3.select(this).select('svg').remove();
            var dom = d3.select(this);
            var svg = dom
                .attr('align', 'center')
                .append('svg')
                .attr('width', width + margin.right + margin.left)
                .attr('height', height + margin.top + margin.bottom);

            var svg_text = svg
                .append('text')
                .attr('x', (width + margin.right + margin.left) / 2)
                .attr('y', margin.top * 2)
                .attr('text-anchor', 'middle')
                .attr('id', 'forecast')
                .style('fill', '#3b4994')
                .style('font-size', '24px')
                .style('opacity', 0.0)
                .text('Forecasted')
                .style('font-family', 'Source Sans Pro');

            var path = d3.geoPath();

            var tip = d3
                .tip()
                .attr('class', 'd3-tip')
                .html((EVENT, d) => generateToolTip(d));

            var cou = svg
                .selectAll('.county')
                .data(counties.features)
                .enter()
                .append('path')
                .attr('class', 'county')
                .attr('d', path)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .on('click', (EVENT, d) => {
                    GAevent('map', 'county', d.properties.name); // GA Event
                    handler(epoch, d);
                });

            svg.append('path')
                .datum(mesh)
                .attr('fill', 'none')
                .attr('stroke', 'white')
                .attr('stroke-width', '1px')
                .attr('stroke-linejoin', 'round')
                .attr('d', path);

            svg.call(tip);

            updateEpoch = function () {
                cou.style('fill', d => {
                    return colorScheme(d.properties.vals);
                });
            };

            updateCovid = function () {};

            updateHousing = function () {
                y.domain(flattened_housing);
            };

            updateColors = function () {
                colors_per_class = Math.floor(Math.sqrt(colors.length));
            };

            showText = function () {
                d3.select('#forecast').transition().duration(100).ease(d3.easeLinear).style('opacity', 1.0);
            };

            removeText = function () {
                d3.select('#forecast').transition().duration(100).ease(d3.easeLinear).style('opacity', 0.0);
            };
        });
    }

    chart.epoch = function (value) {
        if (!arguments.length) return epoch;
        epoch = value;
        if (typeof updateEpoch === 'function') updateEpoch();
        return chart;
    };

    chart.handler = function (func) {
        if (!arguments.length) return handler;
        handler = func;
        return chart;
    };
    chart.covid = function (value) {
        if (!arguments.length) return flattened_covid;
        flattened_covid = value;
        if (typeof updateCovid === 'function') updateCovid();
        return chart;
    };

    chart.housing = function (value) {
        if (!arguments.length) return flattened_housing;
        flattened_housing = value;
        if (typeof updateHousing === 'function') updateHousing();
        return chart;
    };

    chart.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        if (typeof updateColors === 'function') updateColors();
        return chart;
    };

    chart.colorScheme = function (value) {
        if (!arguments.length) return colorScheme;
        if (value === 'housing') {
            colorScheme = housingColors;
        } else if (value === 'covid') {
            colorScheme = covidColors;
        } else {
            colorScheme = bivariateColors;
        }
        if (typeof updateEpoch === 'function') updateEpoch();
        return chart;
    };

    chart.showText = function () {
        if (typeof showText === 'function') showText();
        return chart;
    };

    chart.removeText = function () {
        if (typeof removeText === 'function') removeText();
        return chart;
    };

    return chart;
}

export { choropleth };
