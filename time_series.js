function timeSeriesChart() {
    var margin = { top: 20, right: 80, bottom: 40, left: 80 };
    var width = 1000 - margin.left - margin.right;
    var height = 300 - margin.top - margin.bottom;
    var updateData;
    var updateLabel;
    var updateFips;
    var data = [];
    var date;
    var label;
    var fips;

    var x = d3.scaleTime();
    var yLeft = d3.scaleLinear();
    var yRight = d3.scaleLinear();
    var xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat('%b'));
    var yAxisLeft = d3.axisLeft(yLeft).ticks(8).tickFormat(d3.format('~s'));
    var yAxisRight = d3.axisRight(yRight).ticks(8).tickFormat(d3.format('$~s'));

    function chart(selection) {
        selection.each(function () {
            x.domain(d3.extent(data, d => d[0])).range([0, width]);
            yLeft.domain(d3.extent(data, d => d[1])).range([height, 0]);
            yRight.domain(d3.extent(data, d => d[2])).range([height, 0]);

            var covLine = d3
                .line()
                .x(d => x(d[0]))
                .y(d => yLeft(d[1]));

            var housingLine = d3
                .line()
                .x(d => x(d[0]))
                .y(d => yRight(d[2]));

            var dom = d3.select(this);

            var svg = dom
                .append('svg')
                .attr('class', 'time-series')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

            var svg_text = svg
                .append('text')
                .attr('x', (width + margin.right + margin.left) / 2)
                .attr('y', margin.top * 2)
                .attr('text-anchor', 'middle')
                .style('fill', '#3b4994')
                .style('font-size', '18px')
                .style('font-family', 'Source Sans Pro');

            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', 0 - (height + margin.top + margin.bottom) / 2)
                .attr('y', 10)
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .style('fill', '#3b4994')
                .text('Confirmed COVID-19 Cases')
                .style('font-size', '14px')
                .style('font-family', 'Source Sans Pro');

            svg.append('text')
                .attr('transform', 'rotate(90)')
                .attr('x', (height + margin.top + margin.bottom) / 2)
                .attr('y', -990)
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .style('fill', '#3b4994')
                .text('ZHVI')
                .style('font-size', '14px')
                .style('font-family', 'Source Sans Pro');

            var genter = svg
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            genter.append('g').attr('class', 'x-axis');
            genter.append('g').attr('class', 'y-axis-left');
            genter.append('path').attr('class', 'cov-line');
            genter
                .append('g')
                .attr('transform', `translate(${width}, 0)`)
                .attr('class', 'y-axis-right');
            genter.append('path').attr('class', 'housing-line');

            var g = svg.select('g');

            var covLines = g
                .select('.cov-line')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', '#be64ac')
                .attr('stroke-width', 2)
                .attr('d', covLine);

            var housingLines = g
                .select('.housing-line')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', '#5698b9')
                .attr('stroke-width', 2)
                .attr('d', housingLine);

            svg.select('.x-axis')
                .attr('transform', 'translate(0,' + yLeft.range()[0] + ')')
                .call(xAxis);
            svg.select('.y-axis-left').call(yAxisLeft);
            svg.select('.y-axis-right').call(yAxisRight);

            updateData = function () {
                const data_up_to_date = data.filter(([key, val]) => key <= date);
                var covUpdate = g.select('.cov-line').datum(data_up_to_date);
                var housingUpdate = g.select('.housing-line').datum(data_up_to_date);
                x.domain(d3.extent(data, d => d[0])).range([0, width]);
                yLeft.domain(d3.extent(data, d => d[1])).range([height, 0]);
                yRight.domain(d3.extent(data, d => d[2])).range([height, 0]);
                svg.select('.x-axis').call(xAxis);
                svg.select('.y-axis-left').call(yAxisLeft);
                svg.select('.y-axis-right').call(yAxisRight);
                covUpdate.transition().duration(1000).attr('d', covLine);
                housingUpdate.transition().duration(1000).attr('d', housingLine);
            };

            updateLabel = function () {
                svg_text.text(`${label.county}, ${label.state}`);
            };
            updateFips = function () {
                dom.attr('fips', fips);
            };
        });
    }

    chart.data = function (value, stop_date) {
        if (!arguments.length) return data;
        data = value;
        date = stop_date;
        if (typeof updateData === 'function') updateData();
        return chart;
    };

    chart.label = function (county, state) {
        if (!arguments.length) return label;
        label = { state: state, county: county };
        if (typeof updateLabel === 'function') updateLabel();
        return chart;
    };

    chart.fips = function (value) {
        if (!arguments.length) return fips;
        fips = value;
        if (typeof updateFips === 'function') updateFips();
        return chart;
    };

    return chart;
}

export { timeSeriesChart };
